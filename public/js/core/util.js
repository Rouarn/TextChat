// 通用工具函数（纯函数，无副作用，便于单测与复用）。

/**
 * 生成带前缀的随机 ID。
 * @param {string} [prefix]
 * @returns {string}
 */
export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * 裁剪两端空白并限制最大长度；非字符串返回空串。
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function clampText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().substring(0, maxLength);
}

/**
 * 格式化为 HH:MM（24 小时制）。
 * @param {number} ts 毫秒时间戳
 * @returns {string}
 */
export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN",
    { hour: "2-digit", minute: "2-digit" });
}

/**
 * 日期键：YYYY-M-D（本地时区），用于判断两条消息是否同一天。
 * @param {number} ts
 * @returns {string}
 */
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * 日期分隔文案：今天 / 昨天 / X月X日 / 跨年时 XXXX年X月X日。
 * @param {number} ts
 * @returns {string}
 */
export function dayLabel(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = a =>
    a.getFullYear() === date.getFullYear() &&
    a.getMonth() === date.getMonth() &&
    a.getDate() === date.getDate();

  if (sameDay(today)) return "今天";
  if (sameDay(yesterday)) return "昨天";
  return date.getFullYear() === today.getFullYear()
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 简单防抖：最后一次调用后等待 wait 毫秒执行。
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function & { cancel: () => void }}
 */
export function debounce(fn, wait) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * 判断当前视口是否匹配指定媒体查询（响应式断点的统一入口）。
 * @param {string} query 如 "(max-width: 1024px)"
 * @returns {boolean}
 */
export function matchMedia(query) {
  return window.matchMedia(query).matches;
}
