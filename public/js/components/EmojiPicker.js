// EmojiPicker 组件：表情浮层。
//
// HTML 中 #emojiPicker / #emojiGrid 已固定定位（输入区上方），
// 组件渲染表情网格、处理开关与外部点击/Esc 关闭。
//
// 表情一次性静态渲染（纯文本节点，开销极小），不做重复 DOM 操作。

import { h, $ } from "../core/dom.js";

const EMOJIS = [
  "😀",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤔",
  "😴",
  "😪",
  "😭",
  "😡",
  "🥺",
  "😱",
  "🤯",
  "😳",
  "🤗",
  "🙄",
  "😬",
  "🫡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🫶",
  "👋",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "🎁",
  "⭐",
  "💯",
  "🌹",
  "☕",
  "🍵",
  "🍰",
  "🚀",
  "🌈",
  "☀️",
];

/**
 * 挂载表情选择器。
 * @param {HTMLElement} picker #emojiPicker
 * @param {HTMLElement} grid #emojiGrid
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountEmojiPicker(picker, grid, bus) {
  for (const emoji of EMOJIS) {
    grid.append(
      h(
        "button",
        {
          class: "emoji-item",
          type: "button",
          onClick: event => {
            event.stopPropagation();
            bus.emit("emoji:pick", emoji);
            close();
          },
        },
        emoji,
      ),
    );
  }

  function open() {
    picker.classList.add("is-open");
  }

  function close() {
    picker.classList.remove("is-open");
  }

  function toggle() {
    picker.classList.toggle("is-open");
  }

  // 点击浮层外部关闭（点表情按钮时由 closest(".emoji-btn") 排除）
  document.addEventListener("click", event => {
    if (
      picker.classList.contains("is-open") &&
      !picker.contains(event.target) &&
      !event.target.closest(".emoji-btn")
    ) {
      close();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });

  bus.on("emoji:toggle", toggle);
}
