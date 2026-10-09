// 应用入口（v4 组装层）。
//
// 本文件只做三件事：
//   1. 初始化基础设施：设置、事件总线；
//   2. 挂载组件并创建 Socket 服务；
//   3. 用总线事件把各模块“接起来”。
//
// 具体 DOM 构建、协议细节、通知播放都在各自模块内，
// 新增功能时优先扩展组件 / 服务，而不是膨胀本文件。

import { $ } from "./core/dom.js";
import { EventBus } from "./core/bus.js";
import { loadSettings, getState } from "./services/settings.js";
import { createSocketService } from "./services/socket.js";
import {
  unlockAudio,
  playIncomingSound,
  showDesktopNotification,
  requestNotificationPermission,
} from "./services/notifications.js";

import { mountTopBar } from "./components/TopBar.js";
import { mountIdentityBar } from "./components/IdentityBar.js";
import { mountMessageList } from "./components/MessageList.js";
import { mountTypingIndicator } from "./components/TypingIndicator.js";
import { mountComposer } from "./components/Composer.js";
import { mountEmojiPicker } from "./components/EmojiPicker.js";
import { mountSidebar } from "./components/Sidebar.js";

/** 聊天房间（与服务端 config.chat.roomId 一致） */
const ROOM = "lobby";

async function bootstrap() {
  // ---- 1. 基础设施 ----
  loadSettings();
  const bus = new EventBus();

  // ---- 2. 挂载组件（顺序无关，均只依赖总线） ----
  mountTopBar($("#topBar"), bus);
  mountIdentityBar($("#identityBar"), bus);
  mountMessageList(
    $("#messagesContainer"),
    $("#jumpLatest"),
    $("#jumpBadge"),
    bus,
  );
  mountTypingIndicator($("#typingIndicator"), bus);
  mountSidebar($("#sidebar"), $("#mobileOverlay"), bus);
  mountEmojiPicker($("#emojiPicker"), $("#emojiGrid"), bus);

  // Socket 服务必须先于 Composer 创建（sendAction 依赖它）
  const socketService = createSocketService(bus);

  mountComposer($("#inputContainer"), bus, async text => {
    await socketService.send(ROOM, text);
  });

  // ---- 3. 跨模块事件接线 ----

  // 收到消息：他人消息触发声音与桌面通知（自己的消息静默）
  bus.on("message", message => {
    if (message.sender !== getState().userId) {
      playIncomingSound();
      showDesktopNotification(message);
    }
  });

  // 输入框本地打字状态 -> 上报服务端
  bus.on("typing:local", isStart => socketService.setTyping(isStart));

  // 身份保存 -> 同步服务端
  bus.on("profile:saved", () => socketService.pushProfile());

  // 侧栏清空请求 -> 上报；服务端随后以 history=[] 广播，列表自动刷新
  bus.on("messages:clear-request", () => socketService.clearHistory(ROOM));

  // 重连横幅：连接中断/错误时在消息区顶部提示
  const banner = $("#connectionBanner");
  const bannerText = $("#connectionBannerText");
  bus.on("connection", info => {
    const healthy = info.status === "connected" || info.status === "connecting";
    banner.classList.toggle("show", !healthy);
    banner.classList.toggle("is-error", info.status === "error");
    bannerText.textContent =
      info.status === "error"
        ? "连接出现问题，正在尝试恢复…"
        : "与服务器的连接已断开，正在重连…";
  });
  bus.on("reconnecting", attempt => {
    banner.classList.add("show");
    banner.classList.remove("is-error");
    bannerText.textContent = `网络不稳定，正在第 ${attempt} 次重连…`;
  });

  // ---- 首次用户交互：解除音频自动播放限制、申请通知权限 ----
  const firstInteraction = () => {
    unlockAudio();
    requestNotificationPermission();
    document.removeEventListener("pointerdown", firstInteraction);
    document.removeEventListener("keydown", firstInteraction);
  };
  document.addEventListener("pointerdown", firstInteraction, { once: true });
  document.addEventListener("keydown", firstInteraction, { once: true });

  // ---- 启动连接 ----
  try {
    await socketService.start(ROOM);
  } catch (error) {
    console.error("[app] 初始连接失败，库会在后台自动重连:", error);
    bus.emit("notice", "初始连接失败，将自动重试");
  }
}

bootstrap();
