<template>
  <div ref="scrollContainer" class="messages-container" @scroll="onScroll">
    <!-- 骨架屏：尚未加载到历史消息 -->
    <div v-if="showSkeleton" class="skeleton-wrap">
      <div class="skeleton-bubble">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton-bar w-70"></div>
          <div class="skeleton-bar w-100"></div>
          <div class="skeleton-bar w-45"></div>
        </div>
      </div>
      <div class="skeleton-bubble is-own">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton-bar w-100"></div>
          <div class="skeleton-bar w-70"></div>
        </div>
      </div>
      <div class="skeleton-bubble">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton-bar w-45"></div>
          <div class="skeleton-bar w-100"></div>
          <div class="skeleton-bar w-70"></div>
        </div>
      </div>
    </div>

    <!-- 空状态：已加载但无消息 -->
    <div v-else-if="showEmpty" class="empty-state">
      <img src="/assets/intro.svg" alt="" />
      <div class="empty-title">还没有消息</div>
      <div class="empty-sub">发送第一条消息，开始这次对话吧</div>
    </div>

    <!-- 消息列表（含日期分隔） -->
    <template v-else>
      <template v-for="item in renderItems" :key="item.key">
        <div v-if="item.type === 'divider'" class="day-divider">
          <span>{{ item.label }}</span>
        </div>
        <MessageBubble
          v-else
          :message="item.message"
          :current-user-id="userId"
        />
      </template>
    </template>
  </div>

  <button
    class="jump-latest"
    :class="{ show: !stickToBottom }"
    aria-label="回到底部"
    @click="scrollToBottom"
  >
    <i class="fas fa-arrow-down"></i>
    <span v-if="unread > 0" class="jump-badge show">{{ unread }}</span>
  </button>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue';
import { dayKey, dayLabel } from '@text-chat/shared';
import { useChat } from '../composables/useChat.js';
import { useSettings } from '../composables/useSettings.js';
import MessageBubble from './MessageBubble.vue';

const { messages } = useChat();
const { settings } = useSettings();
const userId = computed(() => settings.userId);

const scrollContainer = ref(null);
const hydrated = ref(false);
const stickToBottom = ref(true);
const unread = ref(0);

const showSkeleton = computed(
  () => messages.value.length === 0 && !hydrated.value,
);
const showEmpty = computed(() => messages.value.length === 0 && hydrated.value);

// 构建渲染列表：在跨天消息之间插入日期分隔
const renderItems = computed(() => {
  const items = [];
  let lastDay = null;
  for (const msg of messages.value) {
    const key = dayKey(msg.ts);
    if (key !== lastDay) {
      items.push({
        type: 'divider',
        key: `divider-${key}`,
        label: dayLabel(msg.ts),
      });
      lastDay = key;
    }
    items.push({
      type: 'message',
      key: msg.id,
      message: msg,
    });
  }
  return items;
});

function isNearBottom() {
  const el = scrollContainer.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
}

function scrollToBottom() {
  const el = scrollContainer.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  stickToBottom.value = true;
  unread.value = 0;
}

function onScroll() {
  if (isNearBottom()) {
    stickToBottom.value = true;
    unread.value = 0;
  } else {
    stickToBottom.value = false;
  }
}

// 监听消息变化：首次变更标记为已加载，新消息到达时滚动
watch(
  messages,
  (newVal, oldVal) => {
    if (!hydrated.value) {
      hydrated.value = true;
    }
    const prevLen = oldVal?.length || 0;
    const newLen = newVal?.length || 0;
    if (newLen <= prevLen) return;

    const lastMsg = newVal[newLen - 1];
    const isOwn = lastMsg?.sender === userId.value;
    const shouldStick = stickToBottom.value || isOwn;

    if (shouldStick) {
      nextTick(() => scrollToBottom());
    } else if (!isOwn) {
      unread.value += newLen - prevLen;
    }
  },
  { deep: true },
);

onMounted(() => {
  nextTick(() => scrollToBottom());
});

onBeforeUnmount(() => {
  stickToBottom.value = true;
  unread.value = 0;
});
</script>
