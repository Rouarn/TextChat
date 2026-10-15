<template>
  <section class="user-setup" :class="{ 'is-editing': isEditing }">
    <!-- 展示态 -->
    <n-space v-if="!isEditing" align="center" class="identity-display">
      <n-avatar round size="small" :style="avatarStyle">
        {{ settings.avatar }}
      </n-avatar>
      <span class="identity-name">{{ settings.name }}</span>
      <n-button
        quaternary
        circle
        size="small"
        aria-label="编辑身份"
        @click="startEdit"
      >
        <template #icon>
          <n-icon><CreateOutline /></n-icon>
        </template>
      </n-button>
    </n-space>

    <!-- 编辑态 -->
    <n-space v-else align="center" class="identity-editor">
      <n-input
        v-model:value="editAvatar"
        class="identity-avatar-input"
        maxlength="2"
        placeholder="头像"
        @keydown.enter="save"
        @keydown.esc="cancel"
      />
      <n-input
        ref="nameInputRef"
        v-model:value="editName"
        class="identity-input"
        maxlength="20"
        placeholder="昵称"
        @keydown.enter="save"
        @keydown.esc="cancel"
      />
      <n-button
        quaternary
        circle
        size="small"
        aria-label="取消"
        @click="cancel"
      >
        <template #icon>
          <n-icon><CloseOutline /></n-icon>
        </template>
      </n-button>
      <n-button type="primary" size="small" @click="save">保存</n-button>
    </n-space>
  </section>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { clampText } from '@text-chat/shared';
import { useSettings } from '../composables/useSettings.js';
import { useSocket } from '../composables/useSocket.js';
import { CreateOutline, CloseOutline } from '@vicons/ionicons5';

const { settings, updateSettings } = useSettings();
const { pushProfile } = useSocket();

const isEditing = ref(false);
const editName = ref('');
const editAvatar = ref('');
const nameInputRef = ref(null);

const avatarStyle = computed(() => ({
  background: 'linear-gradient(135deg,#6366f1,#818cf8)',
  color: '#fff',
  fontWeight: 700,
}));

function startEdit() {
  editName.value = settings.name;
  editAvatar.value = settings.avatar;
  isEditing.value = true;
  nextTick(() => {
    nameInputRef.value?.focus?.();
  });
}

function save() {
  const name = clampText(editName.value, 20) || '匿名用户';
  let avatar = clampText(editAvatar.value, 2);
  if (!avatar) {
    avatar = name.charAt(0) || 'U';
  }
  updateSettings({ name, avatar });
  pushProfile();
  isEditing.value = false;
}

function cancel() {
  editName.value = settings.name;
  editAvatar.value = settings.avatar;
  isEditing.value = false;
}
</script>
