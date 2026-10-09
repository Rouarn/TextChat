<template>
  <n-config-provider
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <NoticeBridge />

        <n-layout class="chat-container" embedded>
          <n-layout-header bordered class="app-header">
            <TopBar @open-sidebar="sidebarOpen = true" />
          </n-layout-header>

          <n-layout has-sider class="main-layout">
            <n-layout-content class="chat-content">
              <IdentityBar />

              <div
                class="connection-banner"
                :class="{ show: showBanner, 'is-error': isBannerError }"
              >
                <n-icon size="16" class="banner-spin">
                  <SyncOutline />
                </n-icon>
                <span>{{ bannerText }}</span>
              </div>

              <MessageList />
              <TypingIndicator />

              <div class="input-area">
                <Composer
                  ref="composer"
                  @toggle-emoji="emojiOpen = !emojiOpen"
                />
              </div>
            </n-layout-content>

            <!-- 桌面端常驻侧栏 -->
            <n-layout-sider
              bordered
              collapse-mode="width"
              :width="280"
              class="sidebar-desktop"
            >
              <Sidebar @close="sidebarOpen = false" />
            </n-layout-sider>
          </n-layout>
        </n-layout>

        <!-- 平板/移动端抽屉侧栏 -->
        <n-drawer
          v-model:show="sidebarOpen"
          :width="300"
          placement="right"
          class="sidebar-drawer"
        >
          <n-drawer-content title="在线用户" closable>
            <Sidebar @close="sidebarOpen = false" />
          </n-drawer-content>
        </n-drawer>

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
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { zhCN, dateZhCN } from 'naive-ui';
import { useChat } from './composables/useChat.js';
import { useSocket } from './composables/useSocket.js';
import { useSettings } from './composables/useSettings.js';
import { useNotifications } from './composables/useNotifications.js';
import { useMessage } from 'naive-ui';
import { SyncOutline } from '@vicons/ionicons5';
import TopBar from './components/TopBar.vue';
import IdentityBar from './components/IdentityBar.vue';
import MessageList from './components/MessageList.vue';
import TypingIndicator from './components/TypingIndicator.vue';
import Composer from './components/Composer.vue';
import EmojiPicker from './components/EmojiPicker.vue';
import Sidebar from './components/Sidebar.vue';

const { connectionStatus, reconnectingAttempt, messages, notice } = useChat();
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

const themeOverrides = {
  common: {
    primaryColor: '#6366f1',
    primaryColorHover: '#4f46e5',
    primaryColorPressed: '#4338ca',
    primaryColorSuppl: '#6366f1',
    borderRadius: '10px',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
  },
};

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
    // 一次新增多条属于进房/重连的历史批量加载，不响铃也不弹通知；
    // 实时消息由服务端逐条广播，每次仅新增 1 条
    if (newLen - prevLen > 1) return;
    const msg = newVal[newLen - 1];
    if (msg.sender === settings.userId) return;
    playIncomingSound();
    showDesktopNotification(msg);
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

// 全局通知桥接：将 useChat 的 notice 通过 n-message 展示
const NoticeBridge = {
  setup() {
    const message = useMessage();
    watch(
      notice,
      (val) => {
        if (val?.message) {
          message.error(val.message);
        }
      },
      { immediate: true },
    );
    return () => null;
  },
};
</script>
