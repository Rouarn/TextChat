<template>
  <div class="input-container">
    <button
      type="button"
      class="emoji-btn"
      aria-label="表情"
      @click="emit('toggle-emoji')"
    >
      <i class="far fa-smile"></i>
    </button>
    <textarea
      ref="textarea"
      v-model="text"
      class="message-input"
      rows="1"
      maxlength="2000"
      placeholder="输入消息，Enter 发送…"
      @input="onInput"
      @keydown="onKeydown"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
    ></textarea>
    <button
      type="button"
      class="send-btn"
      :disabled="!canSend"
      aria-label="发送"
      @click="send"
    >
      <i class="fas fa-paper-plane"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';
import { config } from '@text-chat/shared';
import { useChat } from '../composables/useChat.js';
import { useSocket } from '../composables/useSocket.js';

const ROOM = config.chat.roomId;

const emit = defineEmits(['toggle-emoji']);

const { connectionStatus, showNotice } = useChat();
const { send: socketSend, setTyping } = useSocket();

const text = ref('');
const textarea = ref(null);
const isComposing = ref(false);

const canSend = computed(
  () => connectionStatus.value === 'connected' && text.value.trim().length > 0,
);

let typingTimer = null;
let lastTypingEmit = 0;
const TYPING_THROTTLE = 800;
const TYPING_STOP_DELAY = 1200;

function clearTypingTimer() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function reportTyping() {
  const now = Date.now();
  if (now - lastTypingEmit >= TYPING_THROTTLE) {
    lastTypingEmit = now;
    setTyping(true);
  }
  clearTypingTimer();
  typingTimer = setTimeout(() => {
    setTyping(false);
    lastTypingEmit = 0;
  }, TYPING_STOP_DELAY);
}

function stopTyping() {
  clearTypingTimer();
  setTyping(false);
  lastTypingEmit = 0;
}

function autoResize() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = 'auto';
  const height = Math.min(Math.max(el.scrollHeight, 42), 110);
  el.style.height = `${height}px`;
}

function onInput() {
  autoResize();
  if (text.value.trim()) {
    reportTyping();
  } else {
    stopTyping();
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
    e.preventDefault();
    send();
  }
}

async function send() {
  const content = text.value.trim();
  if (!content) return;
  try {
    await socketSend(ROOM, content);
    text.value = '';
    await nextTick();
    autoResize();
    stopTyping();
  } catch (error) {
    showNotice(error?.message || '发送失败，请重试');
  }
}

function insertEmoji(emoji) {
  const el = textarea.value;
  if (!el) {
    text.value += emoji;
    return;
  }
  const start = el.selectionStart ?? text.value.length;
  const end = el.selectionEnd ?? text.value.length;
  text.value = text.value.slice(0, start) + emoji + text.value.slice(end);
  nextTick(() => {
    const pos = start + emoji.length;
    el.focus();
    el.setSelectionRange(pos, pos);
    autoResize();
  });
}

onBeforeUnmount(() => {
  clearTypingTimer();
});

defineExpose({ insertEmoji });
</script>
