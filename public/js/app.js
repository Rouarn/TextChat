// 实时文本聊天系统 - 客户端应用

// 全局变量
const socket =
  window.SocketClient && window.SocketClient.socket
    ? window.SocketClient.socket
    : io();
let currentUser = {
  id: null,
  name: "匿名用户",
  avatar: "U",
  persistentUserId: null,
};
let onlineUsers = new Map();
let soundEnabled = true;
let notificationsEnabled = true;
let typingTimeout = null;
let isTyping = false;
let lastTypingEmit = 0;
let notificationAudio = null;

// 前端交互：统一 Socket 发送封装与打字节流控制
const TYPING_EMIT_INTERVAL = 800; // 最短间隔，避免频繁发送
const TYPING_STOP_DELAY = 1200; // 停止延迟，保证可靠 stop

function emitSocket(event, payload = {}) {
  try {
    socket.emit(event, payload);
  } catch (e) {
    console.error("Socket emit失败:", event, e);
  }
}

function startTyping() {
  const now = Date.now();
  if (!isTyping || now - lastTypingEmit > TYPING_EMIT_INTERVAL) {
    isTyping = true;
    lastTypingEmit = now;
    emitSocket("typing:start", {
      userId: currentUser.id || socket.id,
      username: currentUser.name,
    });
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (isTyping) {
      isTyping = false;
      emitSocket("typing:stop", { userId: currentUser.id || socket.id });
    }
  }, TYPING_STOP_DELAY);
}

function stopTyping() {
  clearTimeout(typingTimeout);
  if (isTyping) {
    isTyping = false;
    emitSocket("typing:stop", { userId: currentUser.id || socket.id });
  }
}

// DOM 元素
const elements = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  usernameInput: document.getElementById("usernameInput"),
  userAvatar: document.getElementById("userAvatar"),
  onlineCount: document.getElementById("onlineCount"),
  messagesContainer: document.getElementById("messagesContainer"),
  typingIndicator: document.getElementById("typingIndicator"),
  typingUser: document.getElementById("typingUser"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  emojiBtn: document.getElementById("emojiBtn"),
  emojiPicker: document.getElementById("emojiPicker"),
  emojiGrid: document.getElementById("emojiGrid"),
  usersList: document.getElementById("usersList"),
  soundToggle: document.getElementById("soundToggle"),
  notificationToggle: document.getElementById("notificationToggle"),
  clearBtn: document.getElementById("clearBtn"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  sidebar: document.getElementById("sidebar"),
  mobileOverlay: document.getElementById("mobileOverlay"),
};

// 表情符号数据
const emojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😵",
  "🤐",
  "🥴",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👿",
  "👹",
  "👺",
  "🤡",
  "💩",
  "👻",
  "💀",
  "☠️",
  "👽",
  "👾",
  "🤖",
  "🎃",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
];

// 移动端检测
function isMobile() {
  return window.innerWidth <= 768;
}

// 初始化
function init() {
  setupEventListeners();
  generateEmojiPicker();
  loadUserSettings();
  setupMobileNavigation();
  handleResize();
}

// 设置移动端导航
function setupMobileNavigation() {
  elements.mobileNavBtn.addEventListener("click", toggleSidebar);
  elements.mobileOverlay.addEventListener("click", closeSidebar);

  // 监听窗口大小变化
  window.addEventListener("resize", handleResize);
}

// 切换侧边栏
function toggleSidebar() {
  if (isMobile()) {
    elements.sidebar.classList.toggle("open");
    elements.mobileOverlay.classList.toggle("show");
  }
}

// 关闭侧边栏
function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.mobileOverlay.classList.remove("show");
}

// 处理窗口大小变化
function handleResize() {
  if (!isMobile()) {
    closeSidebar();
  }
}

// 设置事件监听器
function setupEventListeners() {
  // Socket 事件
  const on =
    (window.SocketClient && window.SocketClient.on) ||
    ((ev, cb) => socket.on(ev, cb));
  on("connect", handleConnect);
  on("disconnect", handleDisconnect);
  on("message:history", handleMessageHistory);
  on("message:new", handleNewMessage);
  on("user:joined", handleUserJoined);
  on("user:left", handleUserLeft);
  on("typing:start", handleUserTyping);
  on("typing:stop", handleUserStoppedTyping);
  on("users:update", handleUsersUpdate);

  // UI 事件
  elements.usernameInput.addEventListener("input", handleUsernameChange);
  elements.messageInput.addEventListener("input", handleMessageInputChange);
  elements.messageInput.addEventListener("keypress", handleMessageKeyPress);
  elements.sendBtn.addEventListener("click", sendMessage);
  elements.emojiBtn.addEventListener("click", toggleEmojiPicker);
  elements.soundToggle.addEventListener("click", toggleSound);
  if (elements.notificationToggle) {
    elements.notificationToggle.addEventListener("click", toggleNotifications);
  }
  elements.clearBtn.addEventListener("click", clearMessages);

  // 移动端优化：防止双击缩放
  elements.sendBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    sendMessage();
  });

  elements.emojiBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    toggleEmojiPicker(e);
  });

  // 点击外部关闭表情选择器
  function closeEmojiPickerOnOutsideClick(e) {
    if (
      !elements.emojiPicker.contains(e.target) &&
      !elements.emojiBtn.contains(e.target)
    ) {
      elements.emojiPicker.style.display = "none";
    }
  }

  document.addEventListener("click", closeEmojiPickerOnOutsideClick);
  document.addEventListener("touchstart", closeEmojiPickerOnOutsideClick);

  // 移除移动端输入框自动滚动，避免页面向上位移
  // 并在移动端根据视口与各区块高度动态计算消息容器高度
  if (isMobile()) {
    window.addEventListener("resize", () =>
      setTimeout(adjustMessagesHeight, 50)
    );
    elements.messageInput.addEventListener("focus", () =>
      setTimeout(adjustMessagesHeight, 100)
    );
    elements.messageInput.addEventListener("blur", () =>
      setTimeout(adjustMessagesHeight, 100)
    );
  }
}

// Socket 事件处理
function handleConnect() {
  updateConnectionStatus(true);
  currentUser.id = socket.id;
}

function handleDisconnect() {
  updateConnectionStatus(false);
}

function handleMessageHistory(history) {
  elements.messagesContainer.innerHTML = "";
  history.forEach(message => {
    displayMessage(message, false);
  });
  // 历史消息加载完成后仅滚动一次，强制到底部
  scrollToBottom({ force: true });
}

function handleNewMessage(data) {
  displayMessage(data.message, !data.fromSelf, data.fromSelf);
  if (!data.fromSelf) {
    showNotification(data.message);
    playNotificationSound();
  }
  // 新消息：自己的消息强制滚动；他人消息在接近底部时滚动
  scrollToBottom({ force: data.fromSelf === true });
}

function handleUserJoined(user) {
  onlineUsers.set(user.id, user);
  updateUsersList();
  updateOnlineCount();
}

function handleUserLeft(userId) {
  onlineUsers.delete(userId);
  updateUsersList();
  updateOnlineCount();
}

function handleUserTyping(data) {
  if (data.userId !== currentUser.id) {
    elements.typingUser.textContent = data.username;
    elements.typingIndicator.style.display = "block";
  }
}

function handleUserStoppedTyping(data) {
  if (data.userId !== currentUser.id) {
    elements.typingIndicator.style.display = "none";
  }
}

function handleUsersUpdate(users) {
  onlineUsers.clear();
  users.forEach(user => onlineUsers.set(user.id, user));
  updateUsersList();
  updateOnlineCount();
}

// UI 事件处理
function handleUsernameChange() {
  const username = elements.usernameInput.value.trim();
  if (username) {
    currentUser.name = username;
    currentUser.avatar = username.charAt(0).toUpperCase();
    elements.userAvatar.textContent = currentUser.avatar;

    // 确保用户ID正确设置
    const userToUpdate = {
      ...currentUser,
      id: currentUser.id || socket.id,
    };

    emitSocket("user:update", userToUpdate);
    saveUserSettings();
  }
}

function handleMessageInputChange() {
  const message = elements.messageInput.value.trim();
  elements.sendBtn.disabled = !message;

  // 自动调整文本框高度
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height =
    Math.min(elements.messageInput.scrollHeight, 100) + "px";

  // 打字指示器（统一封装 + 节流 + 可靠停止）
  if (message) {
    startTyping();
  } else {
    stopTyping();
  }
}

function handleMessageKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// 发送消息
function sendMessage() {
  const raw = elements.messageInput.value || "";
  const message = raw.trim();
  if (!message || elements.sendBtn.disabled) {
    return;
  }
  {
    const messageData = {
      id: Date.now(),
      text: message,
      username: currentUser.name,
      avatar: currentUser.avatar,
      timestamp: new Date().toISOString(),
      userId: currentUser.id || socket.id,
      sessionId: currentUser.sessionId,
      persistentUserId: currentUser.persistentUserId,
    };

    emitSocket("message:send", messageData);
    elements.messageInput.value = "";
    elements.messageInput.style.height = "auto";
    elements.sendBtn.disabled = true;

    // 停止打字指示器
    stopTyping();

    // 移动端关闭表情选择器
    if (isMobile()) {
      elements.emojiPicker.style.display = "none";
    }
  }
}

// 显示消息
function displayMessage(message, playSound = false, fromSelf = null) {
  const messageDiv = document.createElement("div");
  // 判断是否为自己的消息
  let isOwnMessage;
  if (fromSelf !== null) {
    // 新消息使用服务器提供的fromSelf标记
    isOwnMessage = fromSelf;
  } else {
    // 历史消息：仅根据更稳定的标识判断归属，避免同名误判
    // 1) 持久化用户ID（跨会话保持一致）
    // 2) 会话ID（同一次页面会话）
    // 3) 用户ID（仅在当前客户端已明确设置时比较）
    isOwnMessage = Boolean(
      (message.persistentUserId &&
        message.persistentUserId === currentUser.persistentUserId) ||
        (message.sessionId && message.sessionId === currentUser.sessionId) ||
        (message.userId && currentUser.id && message.userId === currentUser.id)
    );
  }

  messageDiv.className = `message-bubble ${isOwnMessage ? "own" : "other"}`;

  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isOwnMessage) {
    // 自己的消息：头像在右边
    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="message-info">
          <div class="message-username">${message.username}</div>
          <div class="message-content">${escapeHtml(message.text)}</div>
          <div class="message-time">${time}</div>
        </div>
        <div class="message-avatar">${message.avatar}</div>
      </div>
    `;
  } else {
    // 他人的消息：头像在左边
    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="message-avatar">${message.avatar}</div>
        <div class="message-info">
          <div class="message-username">${message.username}</div>
          <div class="message-content">${escapeHtml(message.text)}</div>
          <div class="message-time">${time}</div>
        </div>
      </div>
    `;
  }

  elements.messagesContainer.appendChild(messageDiv);
}

// 更新连接状态
function updateConnectionStatus(connected) {
  elements.statusDot.classList.toggle("connected", connected);
  elements.statusText.textContent = connected ? "已连接" : "连接中...";
}

// 更新在线用户数
function updateOnlineCount() {
  elements.onlineCount.textContent = onlineUsers.size;
}

// 更新用户列表
function updateUsersList() {
  const fragment = document.createDocumentFragment();
  onlineUsers.forEach(user => {
    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    const statusDiv = document.createElement("div");
    statusDiv.className = "user-status";
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "avatar";
    avatarDiv.style.width = "32px";
    avatarDiv.style.height = "32px";
    avatarDiv.style.fontSize = "1rem";
    avatarDiv.textContent = user.avatar;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.name;
    userDiv.appendChild(statusDiv);
    userDiv.appendChild(avatarDiv);
    userDiv.appendChild(nameSpan);
    fragment.appendChild(userDiv);
  });
  elements.usersList.replaceChildren(fragment);
}

// 生成表情选择器
function generateEmojiPicker() {
  elements.emojiGrid.innerHTML = "";
  emojis.forEach(emoji => {
    const emojiDiv = document.createElement("div");
    emojiDiv.className = "emoji-item";
    emojiDiv.textContent = emoji;
    emojiDiv.addEventListener("click", () => {
      elements.messageInput.value += emoji;
      elements.messageInput.focus();
      elements.emojiPicker.style.display = "none";
      handleMessageInputChange();
    });
    elements.emojiGrid.appendChild(emojiDiv);
  });
}

// 切换表情选择器
function toggleEmojiPicker(e) {
  e.stopPropagation();
  const isVisible = elements.emojiPicker.style.display === "block";
  elements.emojiPicker.style.display = isVisible ? "none" : "block";
}

// 切换声音
function toggleSound() {
  soundEnabled = !soundEnabled;
  elements.soundToggle.classList.toggle("active", soundEnabled);
  const icon = elements.soundToggle.querySelector("i");
  icon.className = soundEnabled ? "fas fa-volume-up" : "fas fa-volume-mute";
  saveUserSettings();
}

// 切换显示通知
function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  const btn = elements.notificationToggle;
  if (btn) {
    btn.classList.toggle("active", notificationsEnabled);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = notificationsEnabled
        ? "fas fa-bell"
        : "fas fa-bell-slash";
    }
  }
  // 仅在用户开启时请求权限（需要用户交互）
  if (notificationsEnabled && "Notification" in window) {
    requestNotificationPermission();
  }
  // 若被拒绝，给出简单提示
  if (
    notificationsEnabled &&
    "Notification" in window &&
    Notification.permission === "denied"
  ) {
    alert("浏览器已阻止通知，请在浏览器设置中手动开启站点通知权限。");
  }
  saveUserSettings();
}

// 清空消息
function clearMessages() {
  if (confirm("确定要清空所有聊天记录吗？")) {
    elements.messagesContainer.innerHTML = "";
    emitSocket("message:clear");
  }
}

// 智能滚动到底部（合并请求 + 接近底部判断）
let scrollQueued = false;
function scrollToBottom(options = {}) {
  const { force = false } = options;
  const el = elements.messagesContainer;
  if (!el) return;

  // 若用户不在底部附近且非强制，则不滚动，避免“狂滚动”
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  const NEAR_THRESHOLD = 80; // 距离底部小于该阈值时视为“靠近底部”
  if (!force && distance > NEAR_THRESHOLD) {
    return;
  }

  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    const target = el.scrollHeight;
    try {
      if (typeof el.scrollTo === "function") {
        el.scrollTo({ top: target, behavior: "smooth" });
      } else {
        el.scrollTop = target;
      }
    } catch (e) {
      el.scrollTop = target;
    } finally {
      setTimeout(() => {
        scrollQueued = false;
      }, 150);
    }
  });
}

// 播放通知声音
function playNotificationSound() {
  if (soundEnabled) {
    try {
      if (!notificationAudio) {
        notificationAudio = new Audio("/assets/messagePromptTone.mp3");
        notificationAudio.preload = "auto";
        notificationAudio.volume = 0.3;
      }
      notificationAudio.currentTime = 0;
      notificationAudio.play().catch(() => {});
    } catch (e) {}
  }
}

// 请求通知权限
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    try {
      Notification.requestPermission();
    } catch (e) {}
  }
}

// 显示通知
function showNotification(message) {
  if (
    notificationsEnabled &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(`${message.username} 发来消息`, {
        body: message.text,
        icon: "/assets/favicon.png",
        tag: "chat-message",
      });
    } catch (e) {}
  }
}

// 保存用户设置
function saveUserSettings() {
  try {
    const chatUserSettings = {
      name: currentUser.name,
      avatar: currentUser.avatar,
      soundEnabled: soundEnabled,
      notificationsEnabled: notificationsEnabled,
      userId: currentUser.id,
      lastLoginTime: new Date().toISOString(),
      // 保持当前会话ID，不要在每次保存时重新生成
      sessionId: currentUser.sessionId,
      persistentUserId: currentUser.persistentUserId,
    };
    localStorage.setItem("chatUserSettings", JSON.stringify(chatUserSettings));
  } catch (e) {
    console.error("保存用户设置失败:", e);
  }
}

// 加载用户设置
function loadUserSettings() {
  try {
    const settings = JSON.parse(
      localStorage.getItem("chatUserSettings") || "{}"
    );

    // 加载用户名
    if (settings.name) {
      currentUser.name = settings.name;
      elements.usernameInput.value = settings.name;
    }

    // 加载头像
    if (settings.avatar) {
      currentUser.avatar = settings.avatar;
      elements.userAvatar.textContent = settings.avatar;
    }

    // 加载声音设置
    if (typeof settings.soundEnabled === "boolean") {
      soundEnabled = settings.soundEnabled;
      elements.soundToggle.classList.toggle("active", soundEnabled);
      const icon = elements.soundToggle.querySelector("i");
      icon.className = soundEnabled ? "fas fa-volume-up" : "fas fa-volume-mute";
    }
    // 加载通知设置
    if (typeof settings.notificationsEnabled === "boolean") {
      notificationsEnabled = settings.notificationsEnabled;
    }
    if (elements.notificationToggle) {
      elements.notificationToggle.classList.toggle(
        "active",
        notificationsEnabled
      );
      const nIcon = elements.notificationToggle.querySelector("i");
      if (nIcon) {
        nIcon.className = notificationsEnabled
          ? "fas fa-bell"
          : "fas fa-bell-slash";
      }
      requestNotificationPermission();
    }

    // 设置持久化用户ID用于消息归属判断
    if (settings.persistentUserId) {
      currentUser.persistentUserId = settings.persistentUserId;
    } else {
      currentUser.persistentUserId = generatePersistentUserId();
      saveUserSettings();
    }

    // 设置会话ID（每次刷新都会重新生成）
    if (settings.sessionId) {
      currentUser.sessionId = settings.sessionId;
    } else {
      currentUser.sessionId = generateSessionId();
      saveUserSettings();
    }

    // 在加载完成后，将本地用户名/头像与服务器同步
    // 如果已连接，立即发送；否则在连接建立后发送一次
    const hasProfile =
      Boolean(currentUser.name && currentUser.name !== "匿名用户") ||
      Boolean(currentUser.avatar && currentUser.avatar !== "U");
    if (hasProfile) {
      const emitUpdate = () => {
        const userToUpdate = {
          ...currentUser,
          id: currentUser.id || (socket && socket.id),
        };
        try {
          socket.emit("user:update", userToUpdate);
        } catch (e) {
          console.error("同步用户信息失败:", e);
        }
      };

      if (socket && socket.connected) {
        emitUpdate();
      } else if (socket) {
        socket.once("connect", () => {
          currentUser.id = socket.id;
          emitUpdate();
        });
      }
    }
  } catch (e) {
    console.error("加载用户设置失败:", e);
  }
}

// 生成会话ID
function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

// 生成持久化用户ID
function generatePersistentUserId() {
  // 生成一个永久的用户ID，基于时间戳和随机数
  return (
    "user_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substr(2, 9)
  );
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);

// 视口高度变量，适配移动端键盘弹出导致的高度变化
function setViewportHeightVar() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
document.addEventListener("DOMContentLoaded", setViewportHeightVar);
window.addEventListener("resize", setViewportHeightVar);
window.addEventListener("orientationchange", setViewportHeightVar);

// 动态调整移动端消息容器高度，避免超出屏幕或键盘弹出导致上移
function adjustMessagesHeight() {
  if (!isMobile()) return;
  const vh = window.innerHeight;
  const headerEl = document.querySelector(".header");
  const setupEl = document.querySelector(".user-setup");
  const inputAreaEl = document.querySelector(".input-area");
  const typingEl = document.getElementById("typingIndicator");
  const messagesEl = document.getElementById("messagesContainer");
  if (!messagesEl) return;

  const used =
    (headerEl ? headerEl.offsetHeight : 0) +
    (setupEl ? setupEl.offsetHeight : 0) +
    (inputAreaEl ? inputAreaEl.offsetHeight : 0) +
    (typingEl ? typingEl.offsetHeight : 0);

  const available = Math.max(180, vh - used);
  messagesEl.style.height = available + "px";
  messagesEl.style.maxHeight = available + "px";
  messagesEl.style.flex = "0 0 auto"; // 使用固定高度而非弹性分配
}

document.addEventListener("DOMContentLoaded", () =>
  setTimeout(adjustMessagesHeight, 0)
);

// 防止移动端双击缩放
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  function (event) {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  false
);

// 允许原生滚动（修复移动端页面滚动被阻断的问题）
document.addEventListener(
  "touchmove",
  function () {
    // 保持被动监听，避免阻止默认滚动行为
  },
  { passive: true }
);
