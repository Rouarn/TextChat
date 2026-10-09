import { ref, reactive, computed } from 'vue';

// ---- 全局响应式状态 ----

const connectionStatus = ref('connecting');
const reconnectingAttempt = ref(0);
const messages = ref([]);
const onlineUsers = ref([]);
const typingUsers = reactive(new Map()); // userId -> { name, timer }
const notice = ref(null);
let noticeTimer = null;

// ---- 更新方法 ----

function setConnection(info) {
  clearTimeout(noticeTimer);
  connectionStatus.value = info.status;
  reconnectingAttempt.value = 0;
}

function setReconnecting(attempt) {
  reconnectingAttempt.value = attempt;
  connectionStatus.value = 'connecting';
}

function setHistory(list) {
  messages.value = Array.isArray(list)
    ? [...list].sort((a, b) => a.ts - b.ts)
    : [];
}

function addMessage(message) {
  messages.value.push(message);
}

function setOnlineUsers(users) {
  onlineUsers.value = Array.isArray(users) ? users : [];
}

const TYPING_TIMEOUT = 4000;

function addTypingUser(data) {
  if (!data?.userId) return;
  const existing = typingUsers.get(data.userId);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    typingUsers.delete(data.userId);
  }, TYPING_TIMEOUT);
  typingUsers.set(data.userId, {
    name: data.username || '匿名用户',
    timer,
  });
}

function removeTypingUser(data) {
  if (!data?.userId) return;
  const item = typingUsers.get(data.userId);
  if (item) {
    clearTimeout(item.timer);
    typingUsers.delete(data.userId);
  }
}

function clearMessages() {
  messages.value = [];
}

function showNotice(message) {
  clearTimeout(noticeTimer);
  notice.value = { message, id: Date.now() };
  noticeTimer = setTimeout(() => {
    notice.value = null;
  }, 2500);
}

const typingNames = computed(() =>
  [...typingUsers.values()].map((item) => item.name),
);

export function useChat() {
  return {
    connectionStatus,
    reconnectingAttempt,
    messages,
    onlineUsers,
    typingUsers,
    typingNames,
    notice,
    setConnection,
    setReconnecting,
    setHistory,
    addMessage,
    setOnlineUsers,
    addTypingUser,
    removeTypingUser,
    clearMessages,
    showNotice,
  };
}
