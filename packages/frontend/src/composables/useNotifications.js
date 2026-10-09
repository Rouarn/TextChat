import { useSettings } from './useSettings';

const AUDIO_PATH = '/assets/messagePromptTone.mp3';
const AUDIO_VOLUME = 0.3;

/** @type {HTMLAudioElement | null} */
let audio = null;

function ensureAudio() {
  if (!audio) {
    audio = new Audio(AUDIO_PATH);
    audio.preload = 'auto';
    audio.volume = AUDIO_VOLUME;
    try {
      audio.load();
    } catch {
      // ignore
    }
  }
  return audio;
}

export function useNotifications() {
  const { settings } = useSettings();

  function unlockAudio() {
    const element = ensureAudio();
    try {
      element.muted = true;
      const playing = element.play();
      if (playing && typeof playing.then === 'function') {
        playing
          .then(() => {
            element.pause();
            element.muted = false;
            element.currentTime = 0;
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  function playIncomingSound() {
    if (!settings.soundEnabled) return;
    try {
      const element = ensureAudio();
      element.currentTime = 0;
      element.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  function showDesktopNotification(message) {
    if (
      !settings.notificationsEnabled ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return;
    try {
      new Notification(`${message.username || '匿名用户'} 发来消息`, {
        body: message.content,
        icon: '/assets/favicon.png',
        tag: 'text-chat-message',
      });
    } catch {
      // ignore
    }
  }

  return {
    unlockAudio,
    playIncomingSound,
    requestNotificationPermission,
    showDesktopNotification,
  };
}
