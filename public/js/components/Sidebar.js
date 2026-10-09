// Sidebar 组件：在线用户列表 + 功能开关 + 清空消息。
//
// 桌面端常驻；≤1024px 变为右侧抽屉，由 #mobileOverlay 配合：
//   "sidebar:open-request" -> 打开抽屉 + 遮罩
//   遮罩点击 / 关闭按钮 / Esc -> 关闭
//
// 用户列表只在 presence 更新时整体重渲染（人数少、变化低频），
// 避免逐条 diff 的复杂度。

import { h } from "../core/dom.js";
import { getState, updateSettings } from "../services/settings.js";
import { requestNotificationPermission } from "../services/notifications.js";

/**
 * 挂载侧栏。
 * @param {HTMLElement} root #sidebar
 * @param {HTMLElement} overlay #mobileOverlay
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountSidebar(root, overlay, bus) {
  // ---- 用户列表区 ----

  const headerTitle = h("span", { class: "sidebar-title-text" }, "在线用户");
  const closeButton = h(
    "button",
    {
      class: "sidebar-close",
      type: "button",
      "aria-label": "关闭侧栏",
      onClick: close,
    },
    h("i", { class: "fas fa-xmark" }),
  );
  const header = h(
    "div",
    { class: "sidebar-header" },
    h("i", { class: "fas fa-users" }),
    headerTitle,
    closeButton,
  );

  const list = h("div", { class: "users-list" });

  /**
   * 渲染单个在线用户。
   * @param {{ id: string, name: string, avatar: string }} user
   */
  function userItem(user) {
    const self = user.id === getState().userId;
    return h(
      "div",
      { class: `user-item ${self ? "is-self" : ""}` },
      h("div", { class: "avatar" }, h("span", null, user.avatar || "U")),
      h("span", { class: "user-name" }, user.name || "匿名用户"),
      self
        ? h("span", { class: "self-badge" }, "我")
        : h("span", { class: "user-status" }),
    );
  }

  function renderUsers(users) {
    headerTitle.textContent = `在线用户（${users.length}）`;
    const selfId = getState().userId;
    const ordered = [...users].sort((a, b) => {
      if (a.id === selfId) return -1;
      if (b.id === selfId) return 1;
      return 0;
    });
    list.replaceChildren(...ordered.map(userItem));
  }

  // ---- 功能开关 ----

  /**
   * 创建一个开关型按钮。
   * @param {{ icon: string, label: string, active: boolean, onToggle: (active: boolean) => void }} config
   */
  function toggleButton({ icon, label, active, onToggle }) {
    const button = h(
      "button",
      { class: `control-btn ${active ? "is-active" : ""}`, type: "button" },
      h("i", { class: icon }),
      h("span", null, label),
    );
    button.addEventListener("click", () => {
      const nextActive = !button.classList.contains("is-active");
      button.classList.toggle("is-active", nextActive);
      onToggle(nextActive);
    });
    return button;
  }

  const soundToggle = toggleButton({
    icon: "fas fa-volume-high",
    label: "消息提示音",
    active: getState().soundEnabled,
    onToggle: active => updateSettings({ soundEnabled: active }),
  });

  const notificationToggle = toggleButton({
    icon: "fas fa-bell",
    label: "桌面通知",
    active: getState().notificationsEnabled,
    onToggle: active => {
      updateSettings({ notificationsEnabled: active });
      if (active) requestNotificationPermission();
    },
  });

  const clearButton = h(
    "button",
    {
      class: "control-btn clear-btn",
      type: "button",
      onClick: () => {
        if (
          window.confirm("确定清空当前房间的全部消息吗？此操作对所有人生效。")
        ) {
          bus.emit("messages:clear-request");
        }
      },
    },
    h("i", { class: "fas fa-trash-can" }),
    h("span", null, "清空消息"),
  );

  const controls = h(
    "div",
    { class: "controls" },
    soundToggle,
    notificationToggle,
    clearButton,
  );

  root.replaceChildren(header, list, controls);

  // ---- 抽屉开关（仅移动断点生效） ----

  function open() {
    root.classList.add("open");
    overlay.classList.add("show");
  }

  function close() {
    root.classList.remove("open");
    overlay.classList.remove("show");
  }

  bus.on("sidebar:open-request", open);
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });

  // ---- presence ----
  bus.on("presence", renderUsers);
}
