import { reactive } from 'vue';
import { uid, config } from '@text-chat/shared';

const STORAGE_KEY = 'text-chat:settings';

function createDefaults() {
  return {
    userId: uid('user'),
    name: config.defaults.name,
    avatar: config.defaults.avatar,
    soundEnabled: true,
    notificationsEnabled: true,
  };
}

function loadSettings() {
  const defaults = createDefaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (typeof saved === 'object' && saved !== null) {
      return {
        userId:
          typeof saved.userId === 'string' && saved.userId
            ? saved.userId
            : defaults.userId,
        name:
          typeof saved.name === 'string' && saved.name
            ? saved.name
            : defaults.name,
        avatar:
          typeof saved.avatar === 'string' && saved.avatar
            ? saved.avatar
            : defaults.avatar,
        soundEnabled:
          typeof saved.soundEnabled === 'boolean' ? saved.soundEnabled : true,
        notificationsEnabled:
          typeof saved.notificationsEnabled === 'boolean'
            ? saved.notificationsEnabled
            : true,
      };
    }
  } catch {
    // JSON 解析失败：使用默认值
  }
  return defaults;
}

const settings = reactive(loadSettings());

function updateSettings(patch) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[settings] 持久化失败:', error);
  }
  return settings;
}

export function useSettings() {
  return { settings, updateSettings };
}
