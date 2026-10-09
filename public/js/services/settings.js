// 设置服务：用户身份与功能偏好的唯一数据源，localStorage 持久化。
//
// 其它模块只通过 getState() / update() 访问，不直接读写 localStorage，
// 便于将来替换存储实现（如同步到服务端）。

import { uid } from "../core/util.js";

const STORAGE_KEY = "text-chat:settings";

/** 默认设置（userId 在首次加载时生成并永久复用） */
function createDefaults() {
  return {
    userId: uid("user"),
    name: "匿名用户",
    avatar: "U",
    soundEnabled: true,
    notificationsEnabled: true,
  };
}

/** @type {ReturnType<typeof createDefaults>} */
let state = createDefaults();

/**
 * 从 localStorage 载入并与默认值合并；脏数据安全回退。
 */
export function loadSettings() {
  state = createDefaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (typeof saved === "object" && saved !== null) {
      state = {
        // userId 缺失时保留新生成的（首次访问场景）
        userId: typeof saved.userId === "string" && saved.userId
          ? saved.userId
          : state.userId,
        name: typeof saved.name === "string" && saved.name
          ? saved.name
          : state.name,
        avatar: typeof saved.avatar === "string" && saved.avatar
          ? saved.avatar
          : state.avatar,
        soundEnabled: typeof saved.soundEnabled === "boolean"
          ? saved.soundEnabled
          : true,
        notificationsEnabled: typeof saved.notificationsEnabled === "boolean"
          ? saved.notificationsEnabled
          : true,
      };
    }
  } catch {
    // JSON 解析失败：使用默认值
  }
}

/**
 * 获取当前设置快照。
 * @returns {typeof state}
 */
export function getState() {
  return state;
}

/**
 * 合并更新设置并持久化。
 * @param {Partial<typeof state>} patch
 * @returns {typeof state} 更新后的设置
 */
export function updateSettings(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[settings] 持久化失败:", error);
  }
  return state;
}
