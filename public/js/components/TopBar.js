// TopBar 组件：应用标识 + 连接状态药丸。
//
// 订阅总线：
//   "connection"   更新药丸状态与文案
//   "reconnecting" 文案显示第几次尝试
//   "notice"       短暂展示一次性提示（如发送失败原因）

import { h, $ } from "../core/dom.js";

/** 状态 -> 药丸样式类 / 文案 */
const PILL_VARIANT = {
  connected: "is-connected",
  connecting: "is-connecting",
  disconnected: "is-disconnected",
  error: "is-error",
};

const STATUS_LABEL = {
  connected: "已连接",
  connecting: "连接中…",
  disconnected: "已断开",
  error: "连接错误",
};

/**
 * 挂载 TopBar。
 * @param {HTMLElement} root #topBar
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountTopBar(root, bus) {
  const dot = h("span", { class: "status-dot" });
  const label = h("span", { class: "pill-label" }, "连接中…");
  const pill = h("div", { class: "connection-pill is-connecting" }, dot, label);

  const navButton = h(
    "button",
    {
      class: "mobile-nav-btn",
      type: "button",
      title: "在线用户",
      "aria-label": "打开侧栏",
      onClick: () => bus.emit("sidebar:open-request"),
    },
    h("i", { class: "fas fa-bars" }),
  );

  const countNum = h("span", { class: "online-count-num" }, "0");
  const onlineUsers = h(
    "div",
    { class: "online-users" },
    h("i", { class: "fas fa-users" }),
    countNum,
  );

  const inner = h(
    "div",
    { class: "header-inner" },
    navButton,
    h(
      "div",
      { class: "app-title" },
      h("span", { class: "title-mark" }, h("i", { class: "fas fa-comments" })),
      "实时文本聊天",
    ),
    onlineUsers,
    pill,
  );
  root.replaceChildren(inner);

  bus.on("presence", users => {
    countNum.textContent = String(users.length);
  });

  /** 一次性提示的恢复计时器 */
  let noticeTimer = null;

  function setPill(status, text) {
    dot.classList.toggle("connected", status === "connected");
    pill.className = `connection-pill ${PILL_VARIANT[status] || ""}`;
    label.textContent = text || STATUS_LABEL[status] || "连接中…";
  }

  bus.on("connection", info => {
    clearTimeout(noticeTimer);
    setPill(info.status);
  });

  bus.on("reconnecting", attempt => {
    setPill("connecting", `重新连接中（${attempt}）…`);
  });

  bus.on("notice", message => {
    clearTimeout(noticeTimer);
    const current = label.textContent;
    setPill("error", String(message));
    noticeTimer = setTimeout(() => {
      // 恢复时以当前真实连接状态为准
      const isConnected = dot.classList.contains("connected");
      setPill(isConnected ? "connected" : "connecting");
    }, 2500);
  });
}
