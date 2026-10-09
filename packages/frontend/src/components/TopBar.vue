<template>
  <header class="header">
    <div class="header-inner">
      <button
        type="button"
        class="mobile-nav-btn"
        aria-label="打开侧栏"
        @click="emit('open-sidebar')"
      >
        <i class="fas fa-bars"></i>
      </button>

      <div class="app-title">
        <span class="title-mark">
          <i class="fas fa-comments"></i>
        </span>
        <span>实时文本聊天</span>
      </div>

      <div class="online-users">
        <i class="fas fa-users"></i>
        <span class="online-count-num">{{ onlineUsers.length }}</span>
      </div>

      <div class="connection-pill" :class="pillClass">
        <span
          class="status-dot"
          :class="{ connected: status === 'connected' }"
        ></span>
        <span class="pill-label">{{ pillLabel }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useChat } from '../composables/useChat.js';

defineEmits(['open-sidebar']);

const { connectionStatus, reconnectingAttempt, onlineUsers, notice } =
  useChat();

const status = computed(() => connectionStatus.value);

const pillClass = computed(() => ({
  'is-connected': status.value === 'connected',
  'is-connecting': status.value === 'connecting',
  'is-disconnected': status.value === 'disconnected',
  'is-error': status.value === 'error',
}));

const STATUS_LABELS = {
  connected: '已连接',
  connecting: '连接中…',
  disconnected: '已断开',
  error: '连接错误',
};

const pillLabel = computed(() => {
  if (notice.value) return notice.value.message;
  if (reconnectingAttempt.value > 0)
    return `重新连接中（${reconnectingAttempt.value}）…`;
  return STATUS_LABELS[status.value] || '';
});
</script>
