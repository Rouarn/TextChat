// TypingIndicator 组件："某某正在输入…" 横幅。
//
// HTML 中 #typingIndicator 的结构已固定（用户名 + 三点），
// 组件只负责维护正在打字的用户集合与显隐。
//
// 订阅："typing:start" / "typing:stop"。

import { $ } from "../core/dom.js";

/** 无 typing:stop 到达时的兜底超时（毫秒） */
const TYPING_TIMEOUT = 4000;

/**
 * 挂载打字指示器。
 * @param {HTMLElement} root #typingIndicator
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountTypingIndicator(root, bus) {
  const userNode = $("#typingUser", root);

  /** userId -> { name, timer } */
  const typingUsers = new Map();

  function render() {
    const names = [...typingUsers.values()].map(item => item.name);

    if (names.length === 0) {
      root.classList.remove("visible");
      return;
    }

    const text =
      names.length === 1
        ? `${names[0]} 正在输入`
        : names.length === 2
          ? `${names[0]}、${names[1]} 正在输入`
          : `${names.length} 人正在输入`;

    userNode.textContent = text;
    root.classList.add("visible");
  }

  bus.on("typing:start", data => {
    if (!data?.userId) return;

    // 清理旧的兜底计时器
    typingUsers.get(data.userId)?.timer &&
      clearTimeout(typingUsers.get(data.userId).timer);

    const timer = setTimeout(() => {
      typingUsers.delete(data.userId);
      render();
    }, TYPING_TIMEOUT);

    typingUsers.set(data.userId, {
      name: data.username || "匿名用户",
      timer,
    });
    render();
  });

  bus.on("typing:stop", data => {
    if (!data?.userId) return;
    const item = typingUsers.get(data.userId);
    if (item) {
      clearTimeout(item.timer);
      typingUsers.delete(data.userId);
      render();
    }
  });
}
