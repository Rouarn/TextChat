<template>
  <div class="message-bubble" :class="isOwn ? 'own' : 'other'">
    <div class="message-header">
      <template v-if="isOwn">
        <div class="message-info">
          <span class="message-username">{{ username }}</span>
          <div class="message-content">{{ message.content }}</div>
          <span class="message-time">{{ formatTime(message.ts) }}</span>
        </div>
        <div class="message-avatar">{{ avatar }}</div>
      </template>
      <template v-else>
        <div class="message-avatar">{{ avatar }}</div>
        <div class="message-info">
          <span class="message-username">{{ username }}</span>
          <div class="message-content">{{ message.content }}</div>
          <span class="message-time">{{ formatTime(message.ts) }}</span>
        </div>
      </template>
    </div>
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
</script>
