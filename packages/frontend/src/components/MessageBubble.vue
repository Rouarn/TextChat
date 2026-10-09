<template>
  <div class="message-bubble" :class="isOwn ? 'own' : 'other'">
    <template v-if="isOwn">
      <div class="message-info">
        <span class="message-username">{{ username }}</span>
        <div class="message-content">{{ message.content }}</div>
        <span class="message-time">{{ formatTime(message.ts) }}</span>
      </div>
      <n-avatar round size="small" :style="avatarStyle">
        {{ avatar }}
      </n-avatar>
    </template>
    <template v-else>
      <n-avatar round size="small" :style="avatarStyle">
        {{ avatar }}
      </n-avatar>
      <div class="message-info">
        <span class="message-username">{{ username }}</span>
        <div class="message-content">{{ message.content }}</div>
        <span class="message-time">{{ formatTime(message.ts) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTime } from '@text-chat/shared';

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  currentUserId: {
    type: String,
    default: '',
  },
});

const isOwn = computed(() => props.message.sender === props.currentUserId);
const username = computed(() => props.message.username || '匿名用户');
const avatar = computed(() => props.message.avatar || 'U');

const avatarStyle = computed(() => ({
  background: isOwn.value
    ? 'linear-gradient(135deg,#6366f1,#818cf8)'
    : 'linear-gradient(135deg,#10b981,#34d399)',
  color: '#fff',
  fontWeight: 700,
}));
</script>
