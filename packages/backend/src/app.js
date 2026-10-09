// 应用组装：Express + HTTP + Socket.IO + 唯一的 ChatServer。
// 后端业务逻辑全部收敛到 src/chat/ChatServer.js，本文件只负责装配与启动。

import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import { Server as SocketIOServer } from 'socket.io';

import { config } from '@text-chat/shared';
import { ChatServer } from './chat/ChatServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.use(compression());

// 静态文件：生产环境从 frontend/dist 提供服务
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  // 文件名不含内容哈希时不能用长 maxAge 强缓存，统一用 no-cache 协商缓存
  app.use(
    express.static(frontendDist, {
      etag: true,
      lastModified: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  // SPA fallback：非 API/Socket.IO 路径返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Socket.IO（同源访问，无需额外 CORS 配置）
const io = new SocketIOServer(server);
const chatServer = new ChatServer(io, config.chat);

// 唯一的 HTTP 接口：健康检查（含实时统计）
app.get('/api/health', (req, res) => {
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
║        实时文本聊天系统 v4.0
║
║  服务器运行在:  http://localhost:${config.server.port}
║  前端运行在:    http://localhost:${config.server.frontendPort}/
║  健康检查:      http://localhost:${config.server.port}/api/health
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

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server, io, chatServer };
