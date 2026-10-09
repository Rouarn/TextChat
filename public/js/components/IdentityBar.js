// IdentityBar 组件：昵称与头像标识的编辑入口。
//
// 默认收起展示当前头像与昵称（点击展开编辑态）；
// 保存后：持久化设置 + 发 "profile:saved"（Socket 服务据此同步服务端）。

import { h } from "../core/dom.js";
import { getState, updateSettings } from "../services/settings.js";
import { clampText } from "../core/util.js";

/**
 * 挂载身份栏。
 * @param {HTMLElement} root #identityBar
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountIdentityBar(root, bus) {
  const settings = getState();

  // ---- 收起态：头像 + 昵称 + 编辑按钮 ----
  const displayAvatar = h("span", { class: "identity-avatar" }, settings.avatar);
  const displayName = h("span", { class: "identity-name" }, settings.name);
  const editButton = h(
    "button",
    {
      class: "identity-edit-btn",
      type: "button",
      title: "编辑昵称",
      onClick: switchToEdit,
    },
    h("i", { class: "fas fa-pen" }),
  );

  const display = h(
    "div",
    { class: "identity-display" },
    displayAvatar,
    displayName,
    editButton,
  );

  // ---- 编辑态：昵称输入 + 头像字符输入 + 保存/取消 ----
  const nameInput = h("input", {
    class: "identity-input",
    type: "text",
    maxlength: "20",
    value: settings.name,
    placeholder: "输入昵称",
    "aria-label": "昵称",
  });
  const avatarInput = h("input", {
    class: "identity-avatar-input",
    type: "text",
    maxlength: "2",
    value: settings.avatar,
    placeholder: "U",
    "aria-label": "头像字符",
  });

  function save() {
    const name = clampText(nameInput.value, 20) || "匿名用户";
    const avatar = clampText(avatarInput.value, 2) || name.charAt(0) || "U";
    updateSettings({ name, avatar });

    displayName.textContent = name;
    displayAvatar.textContent = avatar;
    root.classList.remove("is-editing");
    bus.emit("profile:saved");
  }

  function cancel() {
    nameInput.value = getState().name;
    avatarInput.value = getState().avatar;
    root.classList.remove("is-editing");
  }

  const saveButton = h(
    "button",
    { class: "identity-save-btn", type: "button", onClick: save },
    "保存",
  );
  const cancelButton = h(
    "button",
    {
      class: "identity-cancel-btn",
      type: "button",
      onClick: cancel,
      "aria-label": "取消",
    },
    h("i", { class: "fas fa-xmark" }),
  );

  const editor = h(
    "div",
    { class: "identity-editor" },
    avatarInput,
    nameInput,
    h("div", { class: "identity-actions" }, cancelButton, saveButton),
  );

  function switchToEdit() {
    root.classList.add("is-editing");
    nameInput.value = getState().name;
    avatarInput.value = getState().avatar;
    nameInput.focus();
    nameInput.select();
  }

  nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    } else if (event.key === "Escape") {
      cancel();
    }
  });
  avatarInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    } else if (event.key === "Escape") {
      cancel();
    }
  });

  root.replaceChildren(
    h("div", { class: "identity-inner" }, display, editor),
  );
}
