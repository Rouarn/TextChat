<template>
  <section class="user-setup" :class="{ 'is-editing': isEditing }">
    <div class="identity-inner">
      <!-- 展示态 -->
      <div class="identity-display">
        <div class="identity-avatar">{{ settings.avatar }}</div>
        <span class="identity-name">{{ settings.name }}</span>
        <button
          type="button"
          class="identity-edit-btn"
          aria-label="编辑身份"
          @click="startEdit"
        >
          <i class="fas fa-pen"></i>
        </button>
      </div>

      <!-- 编辑态 -->
      <div class="identity-editor">
        <input
          v-model="editAvatar"
          type="text"
          class="identity-avatar-input"
          maxlength="2"
          placeholder="头像"
          @keydown.enter="save"
          @keydown.esc="cancel"
        />
        <input
          ref="nameInput"
          v-model="editName"
          type="text"
          class="identity-input"
          maxlength="20"
          placeholder="昵称"
          @keydown.enter="save"
          @keydown.esc="cancel"
        />
        <div class="identity-actions">
          <button
            type="button"
            class="identity-cancel-btn"
            aria-label="取消"
            @click="cancel"
          >
            <i class="fas fa-xmark"></i>
          </button>
          <button type="button" class="identity-save-btn" @click="save">
            保存
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { clampText } from '@text-chat/shared';
import { useSettings } from '../composables/useSettings.js';
import { useSocket } from '../composables/useSocket.js';

const { settings, updateSettings } = useSettings();
const { pushProfile } = useSocket();

const isEditing = ref(false);
const editName = ref('');
const editAvatar = ref('');
const nameInput = ref(null);

function startEdit() {
  editName.value = settings.name;
  editAvatar.value = settings.avatar;
  isEditing.value = true;
  nextTick(() => {
    nameInput.value?.focus();
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
