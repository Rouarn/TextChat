// 应用组装与启动：Express + HTTP + Socket.IO + 唯一的 ChatServer。
// 后端业务逻辑全部收敛到 src/ChatServer.js，本文件只负责装配与启动。

import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import { Server as SocketIOServer } from 'socket.io';

import {
  showBanner,
  showSuccess,
  handleError,
  log,
  colors,
} from '@vakao/scripts-utils';

import { config } from '@text-chat/shared';
import { ChatServer } from './ChatServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.use(compression());

// 静态文件：生产环境从 frontend/dist 提供服务
// 部署布局（deploy/）下 start-app.js 会 chdir 到部署目录，前端产物位于 ./web；
// 开发（monorepo）布局下回退到 ../../frontend/dist
const deployWebDir = path.join(process.cwd(), 'web');
const monorepoDist = path.join(__dirname, '../../frontend/dist');
const frontendDist = fs.existsSync(deployWebDir) ? deployWebDir : monorepoDist;
// 是否由本进程托管前端静态资源（生产模式）
let servingStatic = false;
if (fs.existsSync(frontendDist)) {
  servingStatic = true;
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
app.get('/api/health', (_req, res) => {
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
function startServer() {
  // 启动失败（如端口被占用）：统一错误输出并退出
  server.on('error', (err) => handleError('服务器启动失败', err));

  server.listen(config.server.port, () => {
    showBanner('实时文本聊天系统 v4.0');
    log(
      `服务器运行在  ${colors.cyan}http://localhost:${config.server.port}${colors.reset}`,
    );
    // 生产模式：前端静态资源由本进程同端口托管；开发模式：Vite 独立端口
    if (servingStatic) {
      log(
        `前端托管在同端口  ${colors.cyan}http://localhost:${config.server.port}/${colors.reset}`,
      );
    } else {
      log(
        `前端运行在    ${colors.cyan}http://localhost:${config.server.frontendPort}/${colors.reset}`,
      );
    }
    log(
      `健康检查      ${colors.cyan}http://localhost:${config.server.port}/api/health${colors.reset}`,
      'check',
    );
    showSuccess('服务器已启动，等待客户端连接');
  });
}

startServer();

/**
 * 优雅关闭。
 * @param {string} signal
 */
function gracefulShutdown(signal) {
  log(`收到 ${signal} 信号，开始关闭服务器`, 'warning');
  server.close(() => {
    io.close();
    showSuccess('服务器已安全关闭');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
