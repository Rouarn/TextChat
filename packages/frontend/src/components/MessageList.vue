<template>
  <div ref="wrapperRef" class="messages-wrapper">
    <n-scrollbar
      ref="scrollbarRef"
      class="messages-container"
      @scroll="onScroll"
    >
      <!-- 加载态 -->
      <div v-if="showSkeleton" class="skeleton-wrap">
        <n-spin size="large" />
      </div>

      <!-- 空状态 -->
      <n-empty v-else-if="showEmpty" class="empty-state">
        <template #icon>
          <n-icon size="56" class="empty-icon">
            <ChatbubbleEllipsesOutline />
          </n-icon>
        </template>
        <div class="empty-title">还没有消息</div>
        <div class="empty-sub">发送第一条消息，开始这次对话吧</div>
      </n-empty>

      <!-- 消息列表（含日期分隔） -->
      <template v-else>
        <template v-for="item in renderItems" :key="item.key">
          <div v-if="item.type === 'divider'" class="day-divider">
            <n-divider>
              <span class="day-label">{{ item.label }}</span>
            </n-divider>
          </div>
          <MessageBubble
            v-else
            :message="item.message"
            :current-user-id="userId"
          />
        </template>
      </template>
    </n-scrollbar>

    <n-button
      v-if="!stickToBottom"
      class="jump-latest"
      circle
      type="primary"
      shadow
      @click="scrollToBottom(true)"
    >
      <template #icon>
        <n-badge :value="unread" :max="99" :show-zero="false">
          <n-icon><ArrowDownOutline /></n-icon>
        </n-badge>
      </template>
    </n-button>
  </div>
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
import { ChatbubbleEllipsesOutline, ArrowDownOutline } from '@vicons/ionicons5';
import MessageBubble from './MessageBubble.vue';

const { messages } = useChat();
const { settings } = useSettings();
const userId = computed(() => settings.userId);

const wrapperRef = ref(null);
const scrollbarRef = ref(null);
const scrollEl = ref(null);
const hydrated = ref(false);
const stickToBottom = ref(true);
const unread = ref(0);

const showSkeleton = computed(
  () => messages.value.length === 0 && !hydrated.value,
);
const showEmpty = computed(() => messages.value.length === 0 && hydrated.value);

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

// 获取 n-scrollbar 内部真正可滚动的容器
function resolveScrollEl() {
  if (scrollEl.value) return scrollEl.value;
  const el = wrapperRef.value?.querySelector('.n-scrollbar-container');
  if (el) scrollEl.value = el;
  return el ?? null;
}

function isNearBottom() {
  const el = resolveScrollEl();
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
}

function scrollToBottom(smooth = false) {
  const el = resolveScrollEl();
  if (!el || !scrollbarRef.value) return;
  scrollbarRef.value.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
  stickToBottom.value = true;
  unread.value = 0;
}

function onScroll(e) {
  scrollEl.value = e.target;
  if (isNearBottom()) {
    stickToBottom.value = true;
    unread.value = 0;
  } else {
    stickToBottom.value = false;
  }
}

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
      // 自己发的消息或本就贴底：跟随滚动到最新
      nextTick(() => scrollToBottom(false));
    } else if (!isOwn) {
      // 用户正在查看历史消息：不打断，仅累计未读
      unread.value += newLen - prevLen;
    }
  },
  { deep: true },
);

onMounted(() => {
  nextTick(() => scrollToBottom(false));
});

onBeforeUnmount(() => {
  stickToBottom.value = true;
  unread.value = 0;
});
</script>
