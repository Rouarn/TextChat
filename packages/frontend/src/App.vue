<template>
  <div class="chat-container">
    <TopBar @open-sidebar="sidebarOpen = true" />
    <IdentityBar />
    <div class="main-content">
      <div class="chat-area">
        <div
          class="connection-banner"
          :class="{ show: showBanner, 'is-error': isBannerError }"
        >
          <i class="fas fa-circle-notch fa-spin"></i>
          <span>{{ bannerText }}</span>
        </div>
        <MessageList />
        <TypingIndicator />
        <div class="input-area">
          <Composer ref="composer" @toggle-emoji="emojiOpen = !emojiOpen" />
        </div>
      </div>
      <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    </div>
    <EmojiPicker
      :open="emojiOpen"
      @close="emojiOpen = false"
      @pick="handleEmojiPick"
    />
    <div
      class="mobile-overlay"
      :class="{ show: sidebarOpen }"
      @click="sidebarOpen = false"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useChat } from './composables/useChat.js';
import { useSocket } from './composables/useSocket.js';
import { useSettings } from './composables/useSettings.js';
import { useNotifications } from './composables/useNotifications.js';
import TopBar from './components/TopBar.vue';
import IdentityBar from './components/IdentityBar.vue';
import MessageList from './components/MessageList.vue';
import TypingIndicator from './components/TypingIndicator.vue';
import Composer from './components/Composer.vue';
import EmojiPicker from './components/EmojiPicker.vue';
import Sidebar from './components/Sidebar.vue';

const { connectionStatus, reconnectingAttempt, messages } = useChat();
const { settings } = useSettings();
const socket = useSocket();
const {
  unlockAudio,
  playIncomingSound,
  requestNotificationPermission,
  showDesktopNotification,
} = useNotifications();

const sidebarOpen = ref(false);
const emojiOpen = ref(false);
const composer = ref(null);

const showBanner = computed(
  () =>
    connectionStatus.value === 'disconnected' ||
    connectionStatus.value === 'error' ||
    reconnectingAttempt.value > 0,
);

const isBannerError = computed(() => connectionStatus.value === 'error');

const bannerText = computed(() => {
  if (reconnectingAttempt.value > 0) {
    return `正在重新连接…（第 ${reconnectingAttempt.value} 次尝试）`;
  }
  if (connectionStatus.value === 'error') {
    return '连接出错，请检查网络';
  }
  if (connectionStatus.value === 'disconnected') {
    return '连接已断开，正在尝试恢复…';
  }
  return '';
});

function handleEmojiPick(emoji) {
  composer.value?.insertEmoji(emoji);
  emojiOpen.value = false;
}

// 监听新消息：非自身消息播放提示音并显示桌面通知
watch(
  messages,
  (newVal, oldVal) => {
    const prevLen = oldVal?.length || 0;
    const newLen = newVal?.length || 0;
    if (newLen <= prevLen) return;
    for (let i = prevLen; i < newLen; i++) {
      const msg = newVal[i];
      if (msg.sender === settings.userId) continue;
      playIncomingSound();
      showDesktopNotification(msg);
    }
  },
  { deep: true },
);

// 首次用户交互时解锁音频并请求通知权限
function onFirstInteraction() {
  unlockAudio();
  requestNotificationPermission();
  cleanupInteraction();
}

function cleanupInteraction() {
  document.removeEventListener('click', onFirstInteraction, true);
  document.removeEventListener('touchstart', onFirstInteraction, true);
  document.removeEventListener('keydown', onFirstInteraction, true);
}

onMounted(() => {
  socket.start();
  document.addEventListener('click', onFirstInteraction, true);
  document.addEventListener('touchstart', onFirstInteraction, true);
  document.addEventListener('keydown', onFirstInteraction, true);
});

onBeforeUnmount(() => {
  cleanupInteraction();
});
</script>
