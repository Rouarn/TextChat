// 通知服务：消息提示音 + 桌面通知。
//
// 所有开关与用户身份实时从 settings 读取；浏览器自动播放限制通过
// unlock() 在首次用户交互时静音预播放来解除。

import { getState } from "./settings.js";

const AUDIO_PATH = "/assets/messagePromptTone.mp3";
const AUDIO_VOLUME = 0.3;

/** @type {HTMLAudioElement | null} */
let audio = null;

/** 惰性创建 Audio 对象。 */
function ensureAudio() {
  if (!audio) {
    audio = new Audio(AUDIO_PATH);
    audio.preload = "auto";
    audio.volume = AUDIO_VOLUME;
    try {
      audio.load();
    } catch {}
  }
  return audio;
}

/**
 * 静音预播放一次，解除浏览器/移动端的自动播放限制。
 * 在首次点击/触摸/按键时调用。
 */
export function unlockAudio() {
  const element = ensureAudio();
  try {
    element.muted = true;
    const playing = element.play();
    if (playing && typeof playing.then === "function") {
      playing
        .then(() => {
          element.pause();
          element.muted = false;
          element.currentTime = 0;
        })
        .catch(() => {});
    }
  } catch {}
}

/** 按设置播放消息提示音。 */
export function playIncomingSound() {
  if (!getState().soundEnabled) return;
  try {
    const element = ensureAudio();
    element.currentTime = 0;
    element.play().catch(() => {});
  } catch {}
}

/** 若尚未请求过桌面通知权限，则发起请求。 */
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

/**
 * 按设置展示桌面通知。
 * @param {{ username?: string, content?: string }} message
 */
export function showDesktopNotification(message) {
  const { notificationsEnabled } = getState();
  if (
    !notificationsEnabled ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;

  try {
    new Notification(`${message.username || "匿名用户"} 发来消息`, {
      body: message.content,
      icon: "/assets/favicon.png",
      tag: "text-chat-message",
    });
  } catch {}
}
