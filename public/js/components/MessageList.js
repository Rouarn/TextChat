// MessageList 组件：消息滚动容器的唯一管理者。
//
// 职责：
//   - 骨架屏（首屏等待历史）-> 历史批量渲染（DocumentFragment，一次回流）
//   - 新消息追加、跨天日期分隔条
//   - 空状态（无消息时展示引导插画）
//   - 滚动位置跟踪：远离底部时新消息不打断阅读，
//     未读角标计数，"回到底部"按钮一键归位
//   - 被动监听滚动（passive），不阻塞合成滚动
//
// 对外暴露动作：renderHistory(list) / append(message) / showSkeleton()

import { h, $ } from "../core/dom.js";
import { dayKey, dayLabel } from "../core/util.js";
import { getState } from "../services/settings.js";
import { createBubble, createDayDivider } from "./MessageBubble.js";

const NEAR_BOTTOM = 80;

/**
 * 挂载消息列表。
 * @param {HTMLElement} container #messagesContainer
 * @param {HTMLElement} jumpButton #jumpLatest
 * @param {HTMLElement} badge #jumpBadge
 * @param {import("../core/bus.js").EventBus} bus
 */
export function mountMessageList(container, jumpButton, badge, bus) {
  /** @type {import("../types.js").MessageData[]} */
  let messages = [];
  /** 已渲染的最后一条消息的日期键 */
  let lastDayKey = null;
  /** 是否贴底（决定新消息是否自动滚动） */
  let stickToBottom = true;
  /** 未读计数（远离底部时累加） */
  let unread = 0;
  /** 首屏历史是否已到达 */
  let hydrated = false;

  // ---- 骨架屏 ----

  function skeletonBubble(own) {
    return h(
      "div",
      { class: `skeleton-bubble ${own ? "is-own" : ""}` },
      h("div", { class: "skeleton-avatar" }),
      h(
        "div",
        { class: "skeleton-lines" },
        h("div", { class: "skeleton-bar w-70" }),
        h("div", { class: "skeleton-bar w-100" }),
        h("div", { class: "skeleton-bar w-45" }),
      ),
    );
  }

  function showSkeleton() {
    hydrated = false;
    container.replaceChildren(
      h(
        "div",
        { class: "skeleton-wrap" },
        skeletonBubble(false),
        skeletonBubble(true),
        skeletonBubble(false),
      ),
    );
  }

  // ---- 空状态 ----

  function emptyState() {
    return h(
      "div",
      { class: "empty-state" },
      h("img", {
        class: "empty-illustration",
        src: "/assets/intro.svg",
        alt: "",
        width: "180",
        height: "180",
        loading: "lazy",
      }),
      h("div", { class: "empty-title" }, "还没有消息"),
      h("div", { class: "empty-sub" }, "发送第一条消息，开始这次对话吧"),
    );
  }

  // ---- 滚动 ----

  function isNearBottom() {
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM
    );
  }

  function scrollToBottom(smooth = false) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function updateJumpButton() {
    jumpButton.classList.toggle("show", !stickToBottom);
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.classList.toggle("show", unread > 0);
  }

  container.addEventListener(
    "scroll",
    () => {
      stickToBottom = isNearBottom();
      if (stickToBottom) unread = 0;
      updateJumpButton();
    },
    { passive: true },
  );

  jumpButton.addEventListener("click", () => {
    stickToBottom = true;
    unread = 0;
    updateJumpButton();
    scrollToBottom(true);
  });

  // ---- 渲染 ----

  /**
   * 把一条消息（含可能的日期分隔条）加入 fragment / 容器。
   * @param {import("../types.js").MessageData} message
   * @param {DocumentFragment | HTMLElement} target
   */
  function renderOne(message, target) {
    const key = dayKey(message.ts);
    if (key !== lastDayKey) {
      target.append(createDayDivider(dayLabel(message.ts)));
      lastDayKey = key;
    }
    target.append(createBubble(message, getState().userId));
  }

  /**
   * 全量替换历史。
   * @param {import("../types.js").MessageData[]} list
   */
  function renderHistory(list) {
    messages = [...list].sort((a, b) => a.ts - b.ts);
    lastDayKey = null;

    const fragment = document.createDocumentFragment();
    for (const message of messages) {
      const key = dayKey(message.ts);
      if (key !== lastDayKey) {
        fragment.append(createDayDivider(dayLabel(message.ts)));
        lastDayKey = key;
      }
      fragment.append(createBubble(message, getState().userId));
    }

    if (messages.length === 0) {
      container.replaceChildren(emptyState());
    } else {
      container.replaceChildren(fragment);
    }

    hydrated = true;
    stickToBottom = true;
    unread = 0;
    updateJumpButton();
    // 等布局完成后归位（图片等资源晚到也只在底部，不影响初始位置）
    requestAnimationFrame(() => scrollToBottom());
  }

  /**
   * 追加单条新消息。
   * @param {import("../types.js").MessageData} message
   */
  function append(message) {
    messages.push(message);

    // 历史为空时第一条消息需先移除空状态
    if (messages.length === 1 || !hydrated) {
      renderHistory(messages);
      return;
    }

    const fragment = document.createDocumentFragment();
    renderOne(message, fragment);
    container.append(fragment);

    const own = message.sender === getState().userId;
    if (stickToBottom || own) {
      stickToBottom = true;
      scrollToBottom();
    } else {
      unread += 1;
    }
    updateJumpButton();
  }

  /** 清空视图（服务端确认清空后） */
  function clear() {
    renderHistory([]);
  }

  // ---- 总线 ----
  bus.on("history", renderHistory);
  bus.on("message", append);
  bus.on("messages:cleared", clear);

  // 初始骨架
  showSkeleton();

  return { renderHistory, append, showSkeleton };
}
