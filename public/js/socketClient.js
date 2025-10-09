// 前端 Socket 模块：通过 ES 模块引入 socket.io-client 并暴露全局封装
import { io } from "socket.io-client";

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

// 兼容现有应用代码：暴露到 window 供 app.js 使用
window.SocketClient = {
  socket,
  emit,
  on,
  once,
};