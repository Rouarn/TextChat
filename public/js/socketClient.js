// 前端 Socket 模块：集中封装事件订阅与发送
(function () {
  const socket = io();

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

  window.SocketClient = {
    socket,
    emit,
    on,
    once,
  };
})();