<template>
  <div class="topbar-inner">
    <n-button
      class="mobile-nav-btn"
      quaternary
      circle
      @click="emit('open-sidebar')"
    >
      <template #icon>
        <n-icon><MenuOutline /></n-icon>
      </template>
    </n-button>

    <div class="app-title">
      <n-icon size="20" class="title-mark">
        <ChatboxOutline />
      </n-icon>
      <span>实时文本聊天</span>
    </div>

    <n-badge :value="onlineUsers.length" :max="99" class="online-badge">
      <n-button quaternary circle>
        <template #icon>
          <n-icon><PeopleOutline /></n-icon>
        </template>
      </n-button>
    </n-badge>

    <n-tag
      :type="statusType"
      size="small"
      round
      class="connection-pill"
    >
      <template #icon>
        <n-icon size="14">
          <component :is="statusIcon" />
        </n-icon>
      </template>
      {{ pillLabel }}
    </n-tag>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useChat } from '../composables/useChat.js';
import {
  MenuOutline,
  ChatboxOutline,
  PeopleOutline,
  CheckmarkCircleOutline,
  RefreshOutline,
  CloseCircleOutline,
  AlertCircleOutline,
} from '@vicons/ionicons5';

const emit = defineEmits(['open-sidebar']);

const { connectionStatus, reconnectingAttempt, onlineUsers, notice } =
  useChat();

const status = computed(() => connectionStatus.value);

const STATUS_LABELS = {
  connected: '已连接',
  connecting: '连接中…',
  disconnected: '已断开',
  error: '连接错误',
};

const statusType = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'success';
    case 'connecting':
      return 'info';
    case 'disconnected':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
});

const statusIcon = computed(() => {
  switch (status.value) {
    case 'connected':
      return CheckmarkCircleOutline;
    case 'connecting':
      return RefreshOutline;
    case 'disconnected':
      return CloseCircleOutline;
    case 'error':
      return AlertCircleOutline;
    default:
      return RefreshOutline;
  }
});

const pillLabel = computed(() => {
  if (notice.value) return notice.value.message;
  if (reconnectingAttempt.value > 0)
    return `重新连接中（${reconnectingAttempt.value}）…`;
  return STATUS_LABELS[status.value] || '';
});
</script>
