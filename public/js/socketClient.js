// 前端 Socket 模块：使用服务器提供的全局 io，无需模块导入
// 服务器会在 /socket.io/socket.io.js 暴露全局 io()
// 该文件仅封装并暴露到 window 供 app.js 使用

const socket =
  typeof window !== "undefined" && window.io ? window.io() : undefined;

function emit(event, payload = {}) {
  try {
    socket.emit(event, payload);
  } catch (e) {
    console.error("Socket emit失败:", event, e);
  }
}

function on(event, handler) {
  socket.on(event, handler);
}

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
