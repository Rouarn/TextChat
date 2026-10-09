<template>
  <div class="typing-indicator" :class="{ visible: typingNames.length > 0 }">
    <n-icon size="14" class="typing-icon">
      <PencilOutline />
    </n-icon>
    <span>{{ text }}</span>
    <span class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useChat } from '../composables/useChat.js';
import { PencilOutline } from '@vicons/ionicons5';

const { typingNames } = useChat();

const text = computed(() => {
  const count = typingNames.value.length;
  if (count <= 0) return '';
  if (count === 1) return `${typingNames.value[0]} 正在输入`;
  if (count === 2)
    return `${typingNames.value[0]}、${typingNames.value[1]} 正在输入`;
  return `${count} 人正在输入`;
});
</script>
