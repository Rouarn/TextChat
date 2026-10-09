// MessageBubble 组件：单条消息气泡（DOM 结构严格对应 CSS 第 8 节）。
//
// 结构（own / other 仅头像与信息块顺序不同）：
//   .message-bubble.own|other
//     .message-header
//       [own:   info -> avatar]
//       [other: avatar -> info]
//       .message-avatar
//       .message-info > .message-username + .message-content + .message-time

import { h } from "../core/dom.js";
import { formatTime } from "../core/util.js";

/**
 * 构建头像块。
 * @param {string} avatar
 */
function avatarBlock(avatar) {
  return h("div", { class: "message-avatar" }, avatar);
}

/**
 * 构建信息块（用户名 + 内容 + 时间）。
 * 内容通过 textContent 渲染，天然防 XSS；保留换行。
 * @param {{ username?: string, content?: string, ts?: number }} message
 */
function infoBlock(message) {
  const content = h(
    "div",
    { class: "message-content" },
    String(message.content ?? ""),
  );
  // 保留用户输入的换行（textContent 不解析 \n，CSS white-space 处理显示）
  content.style.whiteSpace = "pre-wrap";

  return h(
    "div",
    { class: "message-info" },
    h("div", { class: "message-username" }, message.username || "匿名用户"),
    content,
    h("div", { class: "message-time" }, formatTime(message.ts)),
  );
}

/**
 * 创建一条消息气泡。
 * @param {import("../types.js").MessageData} message
 * @param {string} currentUserId
 * @returns {HTMLElement}
 */
export function createBubble(message, currentUserId) {
  const own = message.sender === currentUserId;
  const header = h("div", { class: "message-header" });

  if (own) {
    header.append(infoBlock(message), avatarBlock(message.avatar || "我"));
  } else {
    header.append(avatarBlock(message.avatar || "U"), infoBlock(message));
  }

  return h(
    "div",
    {
      class: `message-bubble ${own ? "own" : "other"}`,
      dataset: {
        messageId: message.id,
        sender: message.sender,
      },
    },
    header,
  );
}

/**
 * 创建日期分隔条。
 * @param {string} label
 * @returns {HTMLElement}
 */
export function createDayDivider(label) {
  return h(
    "div",
    { class: "day-divider", role: "separator" },
    h("span", { class: "day-divider-text" }, label),
  );
}
