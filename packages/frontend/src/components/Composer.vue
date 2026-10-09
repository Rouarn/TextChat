<template>
  <div class="input-container">
    <n-button quaternary circle aria-label="表情" @click="emit('toggle-emoji')">
      <template #icon>
        <n-icon><HappyOutline /></n-icon>
      </template>
    </n-button>

    <n-input
      ref="inputRef"
      v-model:value="text"
      type="textarea"
      class="message-input"
      :autosize="{ minRows: 1, maxRows: 5 }"
      maxlength="2000"
      placeholder="输入消息，Enter 发送…"
      @keydown="onKeydown"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
    />

    <n-button
      type="primary"
      circle
      :disabled="!canSend"
      aria-label="发送"
      @click="send"
    >
      <template #icon>
        <n-icon><SendOutline /></n-icon>
      </template>
    </n-button>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { config } from '@text-chat/shared';
import { useChat } from '../composables/useChat.js';
import { useSocket } from '../composables/useSocket.js';
import { HappyOutline, SendOutline } from '@vicons/ionicons5';

const ROOM = config.chat.roomId;

const emit = defineEmits(['toggle-emoji']);

const { connectionStatus, showNotice } = useChat();
const { send: socketSend, setTyping } = useSocket();

const text = ref('');
const inputRef = ref(null);
const isComposing = ref(false);

const canSend = computed(
  () => connectionStatus.value === 'connected' && text.value.trim().length > 0,
);

// 监听输入内容变化：上报/停止 typing 状态
watch(text, (val) => {
  if (val.trim()) {
    reportTyping();
  } else {
    stopTyping();
  }
});

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
    stopTyping();
  } catch (error) {
    showNotice(error?.message || '发送失败，请重试');
  }
}

function getTextareaEl() {
  // n-input(type=textarea) 实例暴露 textareaElRef
  return inputRef.value?.textareaElRef ?? null;
}

function insertEmoji(emoji) {
  const el = getTextareaEl();
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
  });
}

onBeforeUnmount(() => {
  clearTypingTimer();
});

defineExpose({ insertEmoji });
</script>
