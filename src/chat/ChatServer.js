// ChatServer：整个后端唯一的 Socket 业务模块。
//
// 严格实现 @vakao-ui/socket-system 约定的服务端协议：
//   客户端命令（带 ack）：join-room / leave-room / send-message / get-rooms
//   服务端广播：message（标准 MessageData）
// 在此基础上仅扩展聊天必需的少量自定义事件：
//   profile:update（客户端 -> 服务端，更新昵称/头像）
//   presence:update（服务端 -> 客户端，在线用户列表）
//   history（服务端 -> 客户端，入房后下发的消息历史）
//   typing:start / typing:stop（打字指示，服务端仅转发给房间内其他人）
//   messages:clear（客户端 -> 服务端，清空历史）

import { ClientCommand, SocketEvent } from "@vakao-ui/socket-system";

/** 库协议之外的本应用扩展事件名 */
const ExtensionEvent = {
  ProfileUpdate: "profile:update",
  PresenceUpdate: "presence:update",
  History: "history",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  MessagesClear: "messages:clear",
};

/** 默认昵称与头像（与客户端保持一致） */
const DEFAULT_NAME = "匿名用户";
const DEFAULT_AVATAR = "U";

/**
 * 裁剪字符串并限制长度。
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
function clampText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().substring(0, maxLength);
}

/**
 * 生成消息 ID（与库的规则一致：msg_ 前缀）。
 * @returns {string}
 */
function generateMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export class ChatServer {
  #io;
  #roomId;
  #maxMessages;
  #maxMessageLength;
  #maxUsernameLength;
  #offlineGraceMs;

  /** 消息历史（MessageData，附加 username/avatar 便于展示） */
  #messages = [];
  /** userId -> { id, name, avatar, socketId } */
  #users = new Map();
  /** socketId -> userId */
  #socketIndex = new Map();
  /** userId -> 离线宽限定时器 */
  #leaveTimers = new Map();

  /**
   * @param {import("socket.io").Server} io
   * @param {{
   *   roomId: string,
   *   maxMessages: number,
   *   maxMessageLength: number,
   *   maxUsernameLength: number,
   *   offlineGraceMs: number,
   * }} options
   */
  constructor(io, options) {
    this.#io = io;
    this.#roomId = options.roomId;
    this.#maxMessages = options.maxMessages;
    this.#maxMessageLength = options.maxMessageLength;
    this.#maxUsernameLength = options.maxUsernameLength;
    this.#offlineGraceMs = options.offlineGraceMs;

    io.on("connection", socket => this.#onConnection(socket));
  }

  /** 在线用户数 */
  get userCount() {
    return this.#users.size;
  }

  /** 当前历史消息数 */
  get messageCount() {
    return this.#messages.length;
  }

  /**
   * 绑定单个连接的全部事件。
   * @param {import("socket.io").Socket} socket
   */
  #onConnection(socket) {
    socket.on(ClientCommand.JoinRoom, (payload, ack) =>
      this.#join(socket, payload, ack),
    );
    socket.on(ClientCommand.LeaveRoom, (payload, ack) =>
      this.#leave(socket, payload, ack),
    );
    socket.on(ClientCommand.SendMessage, (payload, ack) =>
      this.#sendMessage(socket, payload, ack),
    );
    socket.on(ClientCommand.GetRooms, (payload, ack) =>
      this.#listRooms(ack),
    );

    socket.on(ExtensionEvent.ProfileUpdate, payload =>
      this.#updateProfile(socket, payload),
    );
    socket.on(ExtensionEvent.TypingStart, payload =>
      this.#relayTyping(socket, true, payload),
    );
    socket.on(ExtensionEvent.TypingStop, payload =>
      this.#relayTyping(socket, false, payload),
    );
    socket.on(ExtensionEvent.MessagesClear, () => this.#clear(socket));

    socket.on("disconnect", () => this.#onDisconnect(socket));
  }

  /**
   * join-room：加入房间、登记用户、下发历史并广播在线列表。
   */
  #join(socket, payload, ack) {
    const reply = response => {
      if (typeof ack === "function") ack(response);
    };

    const roomId = clampText(payload?.roomId, 100);
    const userId = clampText(payload?.userId, 100);
    if (!roomId || !userId) {
      return reply({ success: false, error: "房间ID与用户ID不能为空" });
    }
    if (roomId !== this.#roomId) {
      return reply({ success: false, error: `房间 ${roomId} 不存在` });
    }

    socket.join(roomId);
    this.#socketIndex.set(socket.id, userId);

    // 断线宽限期内快速重连：取消待移除任务，视为同一用户
    const pendingTimer = this.#leaveTimers.get(userId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.#leaveTimers.delete(userId);
    }

    const existing = this.#users.get(userId);
    if (existing) {
      existing.socketId = socket.id;
    } else {
      this.#users.set(userId, {
        id: userId,
        name: DEFAULT_NAME,
        avatar: DEFAULT_AVATAR,
        socketId: socket.id,
      });
    }

    // 仅向本人下发历史
    socket.emit(ExtensionEvent.History, this.#messages);

    reply({ success: true });
    this.#broadcastPresence();
  }

  /**
   * leave-room：显式离开，立即移除在线状态。
   */
  #leave(socket, payload, ack) {
    const reply = response => {
      if (typeof ack === "function") ack(response);
    };

    const userId = this.#socketIndex.get(socket.id);
    if (!userId) {
      return reply({ success: false, error: "尚未加入该房间，无需离开" });
    }

    socket.leave(this.#roomId);
    this.#socketIndex.delete(socket.id);

    const pendingTimer = this.#leaveTimers.get(userId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.#leaveTimers.delete(userId);
    }
    this.#users.delete(userId);

    reply({ success: true });
    this.#broadcastPresence();
  }

  /**
   * send-message：校验、标准化、存储并向房间内所有人（含发送者）广播。
   */
  #sendMessage(socket, payload, ack) {
    const reply = response => {
      if (typeof ack === "function") ack(response);
    };

    const user = this.#getUserBySocket(socket);
    if (!user) {
      return reply({ success: false, error: "请先加入房间" });
    }

    const content = clampText(payload?.content, this.#maxMessageLength);
    if (!content) {
      return reply({ success: false, error: "消息内容不能为空" });
    }

    /** @type {import("@vakao-ui/socket-system").MessageData & { username: string, avatar: string }} */
    const message = {
      id:
        typeof payload?.id === "string" && payload.id.trim()
          ? payload.id
          : generateMessageId(),
      room: this.#roomId,
      content,
      ts:
        typeof payload?.ts === "number" && Number.isFinite(payload.ts)
          ? payload.ts
          : Date.now(),
      sender: user.id,
      // 展示层扩展字段：历史消息也能稳定显示昵称与头像
      username: user.name,
      avatar: user.avatar,
    };

    this.#messages.push(message);
    if (this.#messages.length > this.#maxMessages) {
      this.#messages.splice(0, this.#messages.length - this.#maxMessages);
    }

    this.#io.to(this.#roomId).emit(SocketEvent.Message, message);
    reply({ success: true });
  }

  /**
   * get-rooms：返回房间列表（本应用仅有一个公共大厅）。
   */
  #listRooms(ack) {
    if (typeof ack !== "function") return;
    ack({
      success: true,
      data: {
        rooms: [
          {
            id: this.#roomId,
            name: "公共大厅",
            type: "public",
            members: this.#users.size,
          },
        ],
      },
    });
  }

  /**
   * profile:update：更新昵称/头像并广播在线列表。
   */
  #updateProfile(socket, payload) {
    const user = this.#getUserBySocket(socket);
    if (!user) return;

    const name = clampText(payload?.name, this.#maxUsernameLength);
    if (name) user.name = name;

    if (typeof payload?.avatar === "string" && payload.avatar.trim()) {
      user.avatar = payload.avatar.trim().charAt(0).toUpperCase();
    }

    this.#users.set(user.id, user);
    this.#broadcastPresence();
  }

  /**
   * typing:start / typing:stop：仅转发给房间内其他人。
   * @param {import("socket.io").Socket} socket
   * @param {boolean} isStart
   */
  #relayTyping(socket, isStart) {
    const user = this.#getUserBySocket(socket);
    if (!user) return;

    const event = isStart
      ? ExtensionEvent.TypingStart
      : ExtensionEvent.TypingStop;
    socket.to(this.#roomId).emit(event, {
      userId: user.id,
      username: user.name,
    });
  }

  /**
   * messages:clear：清空历史并向房间广播空历史。
   */
  #clear(socket) {
    const user = this.#getUserBySocket(socket);
    if (!user) return;

    this.#messages = [];
    this.#io.to(this.#roomId).emit(ExtensionEvent.History, []);
  }

  /**
   * disconnect：进入离线宽限期，期间重连则保留用户（刷新/抖动场景）。
   */
  #onDisconnect(socket) {
    const userId = this.#socketIndex.get(socket.id);
    if (!userId) return;

    this.#socketIndex.delete(socket.id);

    const timer = setTimeout(() => {
      this.#leaveTimers.delete(userId);
      if (this.#users.delete(userId)) {
        this.#broadcastPresence();
      }
    }, this.#offlineGraceMs);
    // 不阻止进程退出
    if (typeof timer.unref === "function") timer.unref();
    this.#leaveTimers.set(userId, timer);
  }

  /**
   * 按 socket 查找当前连接对应的用户。
   * @param {import("socket.io").Socket} socket
   */
  #getUserBySocket(socket) {
    const userId = this.#socketIndex.get(socket.id);
    return userId ? this.#users.get(userId) : null;
  }

  /** 广播在线用户列表（精简 DTO） */
  #broadcastPresence() {
    const users = [...this.#users.values()].map(user => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
    }));
    this.#io.emit(ExtensionEvent.PresenceUpdate, { users });
  }
}
