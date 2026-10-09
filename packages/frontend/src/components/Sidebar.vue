<template>
  <div class="sidebar-inner">
    <div class="sidebar-header">
      <n-icon size="18"><PeopleOutline /></n-icon>
      <span class="sidebar-title">在线用户（{{ sortedUsers.length }}）</span>
    </div>

    <n-scrollbar class="users-scroll">
      <n-list :bordered="false" class="users-list">
        <n-list-item
          v-for="user in sortedUsers"
          :key="user.id"
          class="user-item"
          :class="{ 'is-self': user.id === settings.userId }"
        >
          <template #prefix>
            <n-avatar round size="small" :style="avatarStyle(user)">
              {{ user.avatar || user.name?.charAt(0) || 'U' }}
            </n-avatar>
          </template>
          <span class="user-name">{{ user.name || '匿名用户' }}</span>
          <template v-if="user.id === settings.userId" #suffix>
            <n-tag size="small" type="primary" round>我</n-tag>
          </template>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <div class="controls">
      <div class="control-row">
        <n-icon size="18"><VolumeHighOutline /></n-icon>
        <span class="control-label">消息提示音</span>
        <n-switch :value="settings.soundEnabled" @update:value="toggleSound" />
      </div>

      <div class="control-row">
        <n-icon size="18"><NotificationsOutline /></n-icon>
        <span class="control-label">桌面通知</span>
        <n-switch
          :value="settings.notificationsEnabled"
          @update:value="toggleNotifications"
        />
      </div>

      <n-button
        block
        type="error"
        quaternary
        class="clear-btn"
        @click="handleClear"
      >
        <template #icon>
          <n-icon><TrashOutline /></n-icon>
        </template>
        清空消息
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { config } from '@text-chat/shared';
import { useChat } from '../composables/useChat.js';
import { useSettings } from '../composables/useSettings.js';
import { useSocket } from '../composables/useSocket.js';
import { useNotifications } from '../composables/useNotifications.js';
import { useDialog } from 'naive-ui';
import {
  PeopleOutline,
  VolumeHighOutline,
  NotificationsOutline,
  TrashOutline,
} from '@vicons/ionicons5';

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const dialog = useDialog();

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

function avatarStyle(user) {
  return {
    background:
      user.id === settings.userId
        ? 'linear-gradient(135deg,#6366f1,#818cf8)'
        : 'linear-gradient(135deg,#10b981,#34d399)',
    color: '#fff',
    fontWeight: 700,
  };
}

function toggleSound(value) {
  updateSettings({ soundEnabled: value });
}

function toggleNotifications(value) {
  updateSettings({ notificationsEnabled: value });
  if (value) {
    requestNotificationPermission();
  }
}

function handleClear() {
  dialog.warning({
    title: '确认清空消息',
    content: '确定清空当前房间的全部消息吗？此操作对所有人生效。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      clearHistory(config.chat.roomId);
      clearMessages();
    },
  });
}
</script>
