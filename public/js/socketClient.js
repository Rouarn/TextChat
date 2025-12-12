// 前端 Socket 模块
// - 使用服务器提供的全局 io，无需模块导入
// - 服务器在 /socket.io/socket.io.js 暴露全局 io()
// - 该文件仅封装并暴露到 window，供 app.js 使用
/**
 * 建立到服务器的 Socket 连接
 * 提供基础的 emit/on/once 封装以确保错误安全
 */

const socket =
  typeof window !== "undefined" && window.io ? window.io() : undefined;

/**
 * 发送事件到服务器（带错误防护）
 * @param {string} event
 * @param {Object} [payload]
 */
function emit(event, payload = {}) {
  try {
    socket.emit(event, payload);
  } catch (e) {
    console.error("Socket emit失败:", event, e);
  }
}

/**
 * 监听事件
 * @param {string} event
 * @param {(data:any)=>void} handler
 */
function on(event, handler) {
  socket.on(event, handler);
}

/**
 * 监听一次性事件
 * @param {string} event
 * @param {(data:any)=>void} handler
 */
function once(event, handler) {
  socket.once(event, handler);
}

// 兼容现有应用代码：暴露到 window 供 app.js 使用
window.SocketClient = {
  socket,
  emit,
  on,
  once,
};
