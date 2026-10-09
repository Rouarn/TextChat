// 应用组装：Express + HTTP + Socket.IO + 唯一的 ChatServer。
// 后端业务逻辑全部收敛到 src/chat/ChatServer.js，本文件只负责装配与启动。

import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import { Server as SocketIOServer } from "socket.io";

import config from "../config/config.js";
import { ChatServer } from "./chat/ChatServer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");
app.use(compression());

// 静态文件
// 注意：文件名不含内容哈希，不能用长 maxAge 强缓存——否则内容更新后，
// 浏览器在缓存期内根本不发请求，会一直跑旧代码（曾因此报 io is not defined）。
// 统一用 no-cache 协商缓存：每次请求校验 ETag，未变返回 304（开销极小），
// 一变立即拿到新内容。
app.use(
  express.static(path.join(__dirname, "../public"), {
    etag: true,
    lastModified: true,
    setHeaders: res => {
      res.setHeader("Cache-Control", "no-cache");
    },
  }),
);

// Socket.IO（同源访问，无需额外 CORS 配置）
const io = new SocketIOServer(server);
const chatServer = new ChatServer(io, config.chat);

// 唯一的 HTTP 接口：健康检查（含实时统计）
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      onlineUsers: chatServer.userCount,
      totalMessages: chatServer.messageCount,
    },
  });
});

/**
 * 启动服务器。
 */
export function startServer() {
  server.listen(config.server.port, () => {
    console.log(`
╔═════════════════════════════════════
║        实时文本聊天系统 v3.0
║
║  服务器运行在: http://localhost:${config.server.port}
║  健康检查:     http://localhost:${config.server.port}/api/health
╚══════════════════════════════════════
`);
  });
}

/**
 * 优雅关闭。
 * @param {string} signal
 */
function gracefulShutdown(signal) {
  console.log(`收到 ${signal} 信号，开始关闭服务器`);
  server.close(() => {
    io.close();
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app, server, io, chatServer };
