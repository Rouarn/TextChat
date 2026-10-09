// DOM 构建层
//
// h()：轻量 hyperscript，用 JS 直接描述 DOM。
// 优势：
//   - 文本自动走 TextNode，天然防 XSS，组件里不再需要手写 escapeHtml；
//   - 事件、属性、样式声明式绑定；
//   - 支持嵌套数组作为子节点（配合 .map 使用），无需手动拍平。
//
// 示例：
//   h("button", { class: "send-btn", onClick: handle }, h("i", { class: "fas fa-paper-plane" }));

/**
 * 创建元素。
 * @param {string} tag 标签名
 * @param {Record<string, unknown>} [props] 属性 / 事件 / 样式
 * @param {...unknown} children 子节点（Node / 字符串 / 嵌套数组 / null）
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

/**
 * 将 props 应用到节点。
 * @param {HTMLElement} node
 * @param {Record<string, unknown>} props
 */
function applyProps(node, props) {
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;

    if (key === "class" || key === "className") {
      node.className = String(value);
    } else if (key === "text") {
      node.textContent = String(value);
    } else if (key === "dataset" && typeof value === "object") {
      Object.assign(node.dataset, value);
    } else if (key === "style" && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  }
}

/**
 * 追加子节点；数组递归拍平，非 Node 值转 TextNode。
 * @param {HTMLElement} node
 * @param {unknown[]} children
 */
function appendChildren(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;

    if (Array.isArray(child)) {
      appendChildren(node, child);
    } else {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }
}

/**
 * querySelector 简写。
 * @param {string} selector
 * @param {ParentNode} [root]
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * querySelectorAll 简写，返回数组。
 * @param {string} selector
 * @param {ParentNode} [root]
 */
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];
