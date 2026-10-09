<template>
  <aside class="sidebar" :class="{ open }">
    <div class="sidebar-header">
      <i class="fas fa-users"></i>
      <span>在线用户（{{ sortedUsers.length }}）</span>
      <button
        type="button"
        class="sidebar-close"
        aria-label="关闭侧栏"
        @click="emit('close')"
      >
        <i class="fas fa-xmark"></i>
      </button>
    </div>

    <div class="users-list">
      <div
        v-for="user in sortedUsers"
        :key="user.id"
        class="user-item"
        :class="{ 'is-self': user.id === settings.userId }"
      >
        <div class="avatar">
          {{ user.avatar || user.name?.charAt(0) || 'U' }}
        </div>
        <span class="user-name">{{ user.name || '匿名用户' }}</span>
        <span v-if="user.id === settings.userId" class="self-badge">我</span>
        <span v-else class="user-status"></span>
      </div>
    </div>

    <div class="controls">
      <button
        type="button"
        class="control-btn"
        :class="{ 'is-active': settings.soundEnabled }"
        @click="toggleSound"
      >
        <i class="fas fa-volume-high"></i>
        <span>消息提示音</span>
      </button>

      <button
        type="button"
        class="control-btn"
        :class="{ 'is-active': settings.notificationsEnabled }"
        @click="toggleNotifications"
      >
        <i class="fas fa-bell"></i>
        <span>桌面通知</span>
      </button>

      <button type="button" class="control-btn clear-btn" @click="handleClear">
        <i class="fas fa-trash-can"></i>
        <span>清空消息</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { config } from '@text-chat/shared';
import { useChat } from '../composables/useChat.js';
import { useSettings } from '../composables/useSettings.js';
import { useSocket } from '../composables/useSocket.js';
import { useNotifications } from '../composables/useNotifications.js';

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const { onlineUsers, clearMessages } = useChat();
const { settings, updateSettings } = useSettings();
const { clearHistory } = useSocket();
const { requestNotificationPermission } = useNotifications();

const sortedUsers = computed(() => {
  const users = [...onlineUsers.value];
  return users.sort((a, b) => {
    const aSelf = a.id === settings.userId ? 0 : 1;
    const bSelf = b.id === settings.userId ? 0 : 1;
    return aSelf - bSelf;
  });
});

function toggleSound() {
  updateSettings({ soundEnabled: !settings.soundEnabled });
}

function toggleNotifications() {
  const next = !settings.notificationsEnabled;
  updateSettings({ notificationsEnabled: next });
  if (next) {
    requestNotificationPermission();
  }
}

function handleClear() {
  const confirmed = window.confirm(
    '确定清空当前房间的全部消息吗？此操作对所有人生效。',
  );
  if (!confirmed) return;
  clearHistory(config.chat.roomId);
  clearMessages();
}
</script>
