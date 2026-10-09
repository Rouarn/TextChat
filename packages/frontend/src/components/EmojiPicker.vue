<template>
  <div ref="picker" class="emoji-picker" :class="{ 'is-open': open }">
    <div class="emoji-grid">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        class="emoji-item"
        @click.stop="pick(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'pick']);

const picker = ref(null);

const emojis = [
  '😀',
  '😂',
  '🤣',
  '😊',
  '😍',
  '🥰',
  '😘',
  '😎',
  '🤔',
  '😴',
  '😪',
  '😭',
  '😡',
  '🥺',
  '😱',
  '🤯',
  '😳',
  '🤗',
  '🙄',
  '😬',
  '🫡',
  '👍',
  '👎',
  '👏',
  '🙏',
  '💪',
  '🫶',
  '👋',
  '❤️',
  '🔥',
  '✨',
  '🎉',
  '🎁',
  '⭐',
  '💯',
  '🌹',
  '☕',
  '🍵',
  '🍰',
  '🚀',
  '🌈',
  '☀️',
];

function pick(emoji) {
  emit('pick', emoji);
}

function handleDocumentClick(e) {
  if (!props.open) return;
  const target = e.target;
  if (picker.value && picker.value.contains(target)) return;
  if (target.closest && target.closest('.emoji-btn')) return;
  emit('close');
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.open) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, true);
  document.removeEventListener('keydown', handleKeydown);
});
</script>
