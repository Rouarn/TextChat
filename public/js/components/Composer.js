// Composer 组件：消息输入区。
//
// 功能（保留 v3 行为并增强）：
//   - textarea 自动增高（44px 起，最高 120px，多行滚动）
//   - Enter 发送 / Shift+Enter 换行 / 移动端换行按钮也可换行
//   - 输入时节流上报 typing:start（800ms 内不重复），停止 1.2s 后 typing:stop
//   - 表情按钮：发 "emoji:toggle"（EmojiPicker 决定开关与定位）
//   - 发送中禁用按钮，失败时内容保留并提示
//   - 连接未就绪时发送给出明确提示

import { h } from "../core/dom.js";

const TYPING_EMIT_INTERVAL = 800;
const TYPING_STOP_DELAY = 1200;
const MAX_HEIGHT = 110;

/**
 * 挂载输入框。
 * @param {HTMLElement} root #inputContainer
 * @param {import("../core/bus.js").EventBus} bus
 * @param {(text: string) => Promise<void>} sendAction 实际发送动作
 */
export function mountComposer(root, bus, sendAction) {
  let connected = false;
  let lastTypingEmit = 0;
  let stopTimer = null;

  const textarea = h("textarea", {
    class: "message-input",
    rows: "1",
    maxlength: "2000",
    placeholder: "输入消息，Enter 发送…",
    "aria-label": "消息内容",
  });

  const emojiButton = h(
    "button",
    {
      class: "emoji-btn",
      type: "button",
      title: "表情",
      "aria-label": "选择表情",
      onClick: () => bus.emit("emoji:toggle"),
    },
    h("i", { class: "far fa-smile" }),
  );

  const sendButton = h(
    "button",
    {
      class: "send-btn",
      type: "button",
      title: "发送",
      "aria-label": "发送消息",
      disabled: "true",
    },
    h("i", { class: "fas fa-paper-plane" }),
  );

  // ---- 自动增高 ----

  function autoResize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, MAX_HEIGHT) + "px";
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }

  // ---- 打字状态上报 ----

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingEmit >= TYPING_EMIT_INTERVAL) {
      lastTypingEmit = now;
      bus.emit("typing:local", true);
    }
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      bus.emit("typing:local", false);
    }, TYPING_STOP_DELAY);
  }

  // ---- 发送 ----

  function syncSendButton() {
    const canSend = textarea.value.trim().length > 0 && connected;
    sendButton.disabled = canSend ? false : "true";
  }

  async function handleSend() {
    const text = textarea.value.trim();
    if (!text) return;
    if (!connected) {
      bus.emit("notice", "连接未就绪，请稍候再试");
      return;
    }

    sendButton.disabled = "true";
    sendButton.classList.add("is-sending");
    try {
      await sendAction(text);
      textarea.value = "";
      autoResize();
      clearTimeout(stopTimer);
      bus.emit("typing:local", false);
    } catch (error) {
      console.error("[composer] 发送失败:", error);
      bus.emit(
        "notice",
        error?.message ? `发送失败：${error.message}` : "发送失败，请重试",
      );
    } finally {
      sendButton.classList.remove("is-sending");
      syncSendButton();
      textarea.focus();
    }
  }

  textarea.addEventListener("input", () => {
    autoResize();
    if (textarea.value.trim()) notifyTyping();
    syncSendButton();
  });

  textarea.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      // 中文输入法组词中（keyCode 229）不触发发送
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      handleSend();
    }
  });

  sendButton.addEventListener("click", handleSend);

  // ---- 总线：连接状态控制可用性 ----

  bus.on("connection", info => {
    connected = info.status === "connected";
    syncSendButton();
  });

  // 表情被选中时插入到光标位置
  bus.on("emoji:pick", emoji => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.value =
      textarea.value.slice(0, start) + emoji + textarea.value.slice(end);
    const cursor = start + emoji.length;
    textarea.selectionStart = textarea.selectionEnd = cursor;
    autoResize();
    syncSendButton();
    textarea.focus();
  });

  // #inputContainer 本身即 flex 容器（CSS 第 11 节），子元素直接挂载
  root.replaceChildren(emojiButton, textarea, sendButton);
}
