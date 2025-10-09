// 实时文本聊天系统 - 客户端应用

// 全局变量
const socket = io();
let currentUser = {
  id: null,
  name: "匿名用户",
  avatar: "U",
  persistentUserId: null,
};
let onlineUsers = new Map();
let soundEnabled = true;
let typingTimeout = null;
let isTyping = false;

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
  clearBtn: document.getElementById("clearBtn"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  sidebar: document.getElementById("sidebar"),
  mobileOverlay: document.getElementById("mobileOverlay"),
};

// 表情符号数据
const emojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
  "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾",
  "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
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
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("messageHistory", handleMessageHistory);
  socket.on("newMessage", handleNewMessage);
  socket.on("userJoined", handleUserJoined);
  socket.on("userLeft", handleUserLeft);
  socket.on("userTyping", handleUserTyping);
  socket.on("userStoppedTyping", handleUserStoppedTyping);
  socket.on("usersUpdate", handleUsersUpdate);

  // UI 事件
  elements.usernameInput.addEventListener("input", handleUsernameChange);
  elements.messageInput.addEventListener("input", handleMessageInputChange);
  elements.messageInput.addEventListener("keypress", handleMessageKeyPress);
  elements.sendBtn.addEventListener("click", sendMessage);
  elements.emojiBtn.addEventListener("click", toggleEmojiPicker);
  elements.soundToggle.addEventListener("click", toggleSound);
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

  // 移动端输入框焦点处理
  if (isMobile()) {
    elements.messageInput.addEventListener("focus", function () {
      setTimeout(() => {
        this.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    });
  }
}

// Socket 事件处理
function handleConnect() {
  updateConnectionStatus(true);
  currentUser.id = socket.id;
  requestNotificationPermission();
}

function handleDisconnect() {
  updateConnectionStatus(false);
}

function handleMessageHistory(history) {
  elements.messagesContainer.innerHTML = "";
  history.forEach(message => {
    displayMessage(message, false);
  });
  scrollToBottom();
}

function handleNewMessage(data) {
  displayMessage(data.message, !data.fromSelf, data.fromSelf);
  if (!data.fromSelf) {
    showNotification(data.message);
    playNotificationSound();
  }
  scrollToBottom();
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
      id: currentUser.id || socket.id
    };
    
    socket.emit("updateUser", userToUpdate);
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

  // 打字指示器
  if (message && !isTyping) {
    isTyping = true;
    socket.emit("typing", {
      userId: currentUser.id || socket.id,
      username: currentUser.name,
    });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (isTyping) {
      isTyping = false;
      socket.emit("stopTyping", { userId: currentUser.id || socket.id });
    }
  }, 1000);
}

function handleMessageKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// 发送消息
function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (message) {
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

    socket.emit("sendMessage", messageData);
    elements.messageInput.value = "";
    elements.messageInput.style.height = "auto";
    elements.sendBtn.disabled = true;

    // 停止打字指示器
    if (isTyping) {
      isTyping = false;
      socket.emit("stopTyping", { userId: currentUser.id || socket.id });
    }

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
    // 历史消息优先使用持久化用户ID，其次使用会话ID或用户名进行判断
    isOwnMessage = (message.persistentUserId && message.persistentUserId === currentUser.persistentUserId) ||
                   (message.sessionId && message.sessionId === currentUser.sessionId) ||
                   (message.username === currentUser.name);
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
  scrollToBottom();
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
  elements.usersList.innerHTML = "";
  onlineUsers.forEach(user => {
    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    userDiv.innerHTML = `
      <div class="user-status"></div>
      <div class="avatar" style="width: 32px; height: 32px; font-size: 1rem;">${user.avatar}</div>
      <span>${user.name}</span>
    `;
    elements.usersList.appendChild(userDiv);
  });
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
  icon.className = soundEnabled
    ? "fas fa-volume-up"
    : "fas fa-volume-mute";
  saveUserSettings();
}

// 清空消息
function clearMessages() {
  if (confirm("确定要清空所有聊天记录吗？")) {
    elements.messagesContainer.innerHTML = "";
  }
}

// 滚动到底部
function scrollToBottom() {
  setTimeout(() => {
    elements.messagesContainer.scrollTop =
      elements.messagesContainer.scrollHeight;
  }, 100);
}

// 播放通知声音
function playNotificationSound() {
  if (soundEnabled) {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
      );
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }
}

// 请求通知权限
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// 显示通知
function showNotification(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`${message.username} 发来消息`, {
        body: message.text,
        icon: "/favicon.ico",
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
      userId: currentUser.id,
      lastLoginTime: new Date().toISOString(),
      // 保持当前会话ID，不要在每次保存时重新生成
      sessionId: currentUser.sessionId,
      persistentUserId: currentUser.persistentUserId
    };
    localStorage.setItem("chatUserSettings", JSON.stringify(chatUserSettings));
  } catch (e) {
    console.error('保存用户设置失败:', e);
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
      icon.className = soundEnabled
        ? "fas fa-volume-up"
        : "fas fa-volume-mute";
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
    
  } catch (e) {
    console.error('加载用户设置失败:', e);
  }
}

// 生成会话ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 生成持久化用户ID
function generatePersistentUserId() {
  // 生成一个永久的用户ID，基于时间戳和随机数
  return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);

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

// 防止移动端拖拽
document.addEventListener(
  "touchmove",
  function (e) {
    if (e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault();
    }
  },
  { passive: false }
);