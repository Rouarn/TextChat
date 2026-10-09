// Socket 服务：封装 @vakao-ui/socket-system，对外只暴露应用语义。
//
// 输入：EventBus + 设置读取函数。
// 输出到总线的事件（组件只订阅这些，不直接接触库）：
//   "connection"  ConnectionInfo            连接状态快照
//   "message"     MessageData               服务端广播的新消息
//   "history"     MessageData[]             入房/清空调用后的全量历史
//   "presence"    PresenceUser[]            在线用户列表
//   "typing:start" / "typing:stop" { userId, username }
//   "reconnecting" number                   第几次重连
//
// 动作（组件调用返回值）：
//   start() / send(room, text) / pushProfile() / setTyping(start) / clearHistory(room)

import { createSocket } from "/vendor/socket-system.bundle.js";
import { getState } from "./settings.js";

/** 库协议之外的本应用扩展事件（需与后端 ChatServer 保持一致） */
const ExtensionEvent = {
  ProfileUpdate: "profile:update",
  PresenceUpdate: "presence:update",
  History: "history",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  MessagesClear: "messages:clear",
};

/**
 * 创建 Socket 服务。
 * @param {import("../core/bus.js").EventBus} bus
 */
export function createSocketService(bus) {
  const settings = getState();

  const socket = createSocket({
    url: window.location.origin,
    userId: settings.userId,
    timeout: 20000,
  });

  // ---- 库标准事件 -> 应用总线 ----

  socket.onStateChange(info => {
    bus.emit("connection", info);
  });

  socket.onMessage(message => {
    bus.emit("message", message);
  });

  socket.onError(error => {
    console.error("[socket] 后台错误:", error.type, error.message);
  });

  socket.on("reconnecting", attempt => {
    bus.emit("reconnecting", attempt);
  });

  // ---- 应用扩展事件 ----

  socket.on(ExtensionEvent.History, messages => {
    bus.emit("history", Array.isArray(messages) ? messages : []);
  });

  socket.on(ExtensionEvent.PresenceUpdate, data => {
    bus.emit("presence", data?.users ?? []);
  });

  socket.on(ExtensionEvent.TypingStart, data => {
    bus.emit("typing:start", data);
  });

  socket.on(ExtensionEvent.TypingStop, data => {
    bus.emit("typing:stop", data);
  });

  // 入房成功（含断线重连后的房间自动恢复）：重新同步昵称/头像
  socket.on("roomJoined", () => {
    pushProfile();
  });

  // ---- 动作 ----

  /**
   * 建立连接并加入房间。
   * @param {string} room
   */
  async function start(room) {
    await socket.connect();
    await socket.joinRoom(room, getState().userId);
  }

  /**
   * 发送消息；失败时原样抛出（库的 SocketError，组件可程序化处理）。
   * @param {string} room
   * @param {string} text
   */
  function send(room, text) {
    return socket.sendMessage(room, text);
  }

  /** 把当前设置中的昵称/头像同步给服务端 */
  function pushProfile() {
    const { name, avatar } = getState();
    socket.emit(ExtensionEvent.ProfileUpdate, { name, avatar });
  }

  /**
   * 上报本地打字状态。
   * @param {boolean} isStart
   */
  function setTyping(isStart) {
    const { userId, name } = getState();
    socket.emit(isStart ? ExtensionEvent.TypingStart : ExtensionEvent.TypingStop, {
      userId,
      username: name,
    });
  }

  /**
   * 请求清空房间历史。
   * @param {string} room
   */
  function clearHistory(room) {
    socket.emit(ExtensionEvent.MessagesClear, { room });
  }

  return { start, send, pushProfile, setTyping, clearHistory };
}
