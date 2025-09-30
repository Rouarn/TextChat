const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// 导入配置和服务
const config = require("../config/config");
const Logger = require("./services/logger");
const UserService = require("./services/userService");
const MessageService = require("./services/messageService");
const SocketController = require("./controllers/socketController");
const apiRoutes = require("./routes/api");

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: config.cors,
});

// 初始化服务
const userService = new UserService();
const messageService = new MessageService();
const socketController = new SocketController(userService, messageService);

// 将服务实例存储到app.locals中，供路由使用
app.locals.userService = userService;
app.locals.messageService = messageService;

// 静态文件服务 - public目录作为根目录
app.use(express.static(path.join(__dirname, "../public")));

// API路由
app.use("/api", apiRoutes);

// Socket.IO连接处理
io.on("connection", socket => {
  socketController.handleConnection(socket, io);
});

// 全局错误处理
process.on("uncaughtException", error => {
  Logger.error("未捕获的异常", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  Logger.error("未处理的Promise拒绝", { reason: reason, promise: promise });
});

// 定期清理任务
setInterval(() => {
  userService.cleanupInactiveUsers(config.chat.userInactiveThreshold, io);
}, config.chat.cleanupInterval);

setInterval(() => {
  userService.cleanupTypingIndicators(config.chat.typingTimeout, io);
}, 1000);

// 启动服务器
function startServer() {
  server.listen(config.server.port, () => {
    Logger.info(`聊天服务器启动成功`, {
      port: config.server.port,
      environment: config.server.environment,
      pid: process.pid,
    });

    console.log(`
╔═════════════════════════════════════
║        实时文本聊天系统 - 优化版                               
║                                                                
║  🚀 服务器运行在: http://localhost:${config.server.port}       
║  📊 健康检查: http://localhost:${config.server.port}/api/health
║  📈 统计信息: http://localhost:${config.server.port}/api/stats 
║                                                                
║  ✨ 功能特性:                        
║  • 用户系统和头像                    
║  • 消息气泡和时间戳                  
║  • 打字指示器                        
║  • 表情符号支持                      
║  • 桌面通知                          
║  • 响应式设计                        
║  • 错误处理和日志                    
║                                      
╚══════════════════════════════════════
        `);
  });
}

// 优雅关闭
function gracefulShutdown(signal) {
  Logger.info(`收到${signal}信号，开始优雅关闭`);
  server.close(() => {
    Logger.info("服务器已关闭");
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server, io, startServer };
