const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 配置
const PORT = process.env.PORT || 3000;
const MAX_MESSAGES = 1000; // 最大消息数量
const MAX_MESSAGE_LENGTH = 1000; // 最大消息长度
const TYPING_TIMEOUT = 3000; // 打字指示器超时时间

// 数据存储
let messages = [];
let users = new Map(); // 存储在线用户信息
let typingUsers = new Map(); // 存储正在打字的用户

// 日志系统
class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        
        // 可选：写入日志文件
        if (process.env.LOG_TO_FILE === 'true') {
            this.writeToFile(logEntry);
        }
    }
    
    static info(message, data) {
        this.log('info', message, data);
    }
    
    static warn(message, data) {
        this.log('warn', message, data);
    }
    
    static error(message, data) {
        this.log('error', message, data);
    }
    
    static writeToFile(logEntry) {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
        
        const logFile = path.join(logDir, `chat-${new Date().toISOString().split('T')[0]}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFile(logFile, logLine, (err) => {
            if (err) console.error('写入日志文件失败:', err);
        });
    }
}

// 工具函数
function sanitizeMessage(text) {
    if (typeof text !== 'string') return '';
    return text.trim().substring(0, MAX_MESSAGE_LENGTH);
}

function sanitizeUsername(name) {
    if (typeof name !== 'string') return '匿名用户';
    return name.trim().substring(0, 20) || '匿名用户';
}

function generateUserId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: '无效的消息格式' };
    }
    
    if (!message.text || typeof message.text !== 'string') {
        return { valid: false, error: '消息内容不能为空' };
    }
    
    if (message.text.length > MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `消息长度不能超过${MAX_MESSAGE_LENGTH}字符` };
    }
    
    return { valid: true };
}

// 消息管理
function addMessage(message) {
    // 添加服务器时间戳
    message.serverTimestamp = new Date().toISOString();
    
    messages.push(message);
    
    // 限制消息数量
    if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(-MAX_MESSAGES);
        Logger.info('消息数量超限，已清理旧消息');
    }
    
    Logger.info('新消息已添加', { 
        messageId: message.id, 
        userId: message.user?.id,
        username: message.user?.name 
    });
}

function clearAllMessages() {
    const messageCount = messages.length;
    messages = [];
    Logger.info(`已清空所有消息，共${messageCount}条`);
}

// 用户管理
function addUser(socketId, userInfo = {}) {
    const user = {
        id: socketId,
        socketId: socketId,
        name: sanitizeUsername(userInfo.name) || '匿名用户',
        avatar: userInfo.avatar || 'U',
        joinTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
    
    users.set(socketId, user);
    Logger.info('用户加入', { userId: socketId, username: user.name });
    return user;
}

function removeUser(socketId) {
    const user = users.get(socketId);
    if (user) {
        users.delete(socketId);
        typingUsers.delete(socketId);
        Logger.info('用户离开', { userId: socketId, username: user.name });
        return user;
    }
    return null;
}

function updateUser(socketId, userInfo) {
    const user = users.get(socketId);
    if (user) {
        user.name = sanitizeUsername(userInfo.name) || user.name;
        user.avatar = userInfo.avatar || user.avatar;
        user.lastActivity = new Date().toISOString();
        users.set(socketId, user);
        Logger.info('用户信息更新', { userId: socketId, username: user.name });
        return user;
    }
    return null;
}

function getUsersList() {
    return Array.from(users.values());
}

// 打字指示器管理
function setUserTyping(socketId, username) {
    typingUsers.set(socketId, {
        username: sanitizeUsername(username),
        timestamp: Date.now()
    });
    
    // 设置超时清理
    setTimeout(() => {
        if (typingUsers.has(socketId)) {
            const typingInfo = typingUsers.get(socketId);
            if (Date.now() - typingInfo.timestamp >= TYPING_TIMEOUT) {
                typingUsers.delete(socketId);
                io.emit('userStoppedTyping', { userId: socketId });
            }
        }
    }, TYPING_TIMEOUT);
}

function removeUserTyping(socketId) {
    typingUsers.delete(socketId);
}

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users: users.size,
        messages: messages.length
    });
});

// API端点
app.get('/api/stats', (req, res) => {
    res.json({
        onlineUsers: users.size,
        totalMessages: messages.length,
        typingUsers: typingUsers.size,
        uptime: process.uptime()
    });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
    Logger.info('新的Socket连接', { socketId: socket.id });
    
    // 添加用户
    const user = addUser(socket.id);
    
    try {
        // 发送历史消息
        socket.emit('messageHistory', messages);
        
        // 发送当前用户列表
        socket.emit('usersUpdate', getUsersList());
        
        // 通知其他用户有新用户加入
        socket.broadcast.emit('userJoined', user);
        
        // 更新所有用户的在线用户列表
        io.emit('usersUpdate', getUsersList());
        
    } catch (error) {
        Logger.error('发送初始数据失败', { socketId: socket.id, error: error.message });
    }
    
    // 处理用户信息更新
    socket.on('updateUser', (userInfo) => {
        try {
            const updatedUser = updateUser(socket.id, userInfo);
            if (updatedUser) {
                // 通知所有用户更新用户列表
                io.emit('usersUpdate', getUsersList());
            }
        } catch (error) {
            Logger.error('更新用户信息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '更新用户信息失败' });
        }
    });
    
    // 处理发送消息
    socket.on('sendMessage', (messageData) => {
        try {
            // 验证消息
            const validation = validateMessage(messageData);
            if (!validation.valid) {
                socket.emit('error', { message: validation.error });
                return;
            }
            
            // 获取用户信息
            const user = users.get(socket.id);
            if (!user) {
                socket.emit('error', { message: '用户信息不存在' });
                return;
            }
            
            // 创建消息对象
            const message = {
                id: messageData.id || (Date.now() + Math.random()),
                text: sanitizeMessage(messageData.text),
                timestamp: messageData.timestamp || new Date().toISOString(),
                user: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar
                }
            };
            
            // 添加到消息列表
            addMessage(message);
            
            // 发送给发送者（标记为自己发送的）
            socket.emit('newMessage', {
                message: message,
                fromSelf: true
            });
            
            // 广播给其他用户（标记为他人发送的）
            socket.broadcast.emit('newMessage', {
                message: message,
                fromSelf: false
            });
            
            // 更新用户活动时间
            user.lastActivity = new Date().toISOString();
            
        } catch (error) {
            Logger.error('处理消息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '发送消息失败' });
        }
    });
    
    // 处理打字指示器
    socket.on('typing', (data) => {
        try {
            const user = users.get(socket.id);
            if (user && data.username) {
                setUserTyping(socket.id, data.username);
                socket.broadcast.emit('userTyping', {
                    userId: socket.id,
                    username: sanitizeUsername(data.username)
                });
            }
        } catch (error) {
            Logger.error('处理打字指示器失败', { socketId: socket.id, error: error.message });
        }
    });
    
    socket.on('stopTyping', (data) => {
        try {
            removeUserTyping(socket.id);
            socket.broadcast.emit('userStoppedTyping', {
                userId: socket.id
            });
        } catch (error) {
            Logger.error('停止打字指示器失败', { socketId: socket.id, error: error.message });
        }
    });
    
    // 处理清空消息
    socket.on('clearMessages', () => {
        try {
            const user = users.get(socket.id);
            if (user) {
                clearAllMessages();
                io.emit('messageHistory', messages);
                Logger.info('用户清空了所有消息', { userId: socket.id, username: user.name });
            }
        } catch (error) {
            Logger.error('清空消息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '清空消息失败' });
        }
    });
    
    // 处理断开连接
    socket.on('disconnect', (reason) => {
        try {
            const user = removeUser(socket.id);
            if (user) {
                // 通知其他用户有用户离开
                socket.broadcast.emit('userLeft', socket.id);
                
                // 更新所有用户的在线用户列表
                io.emit('usersUpdate', getUsersList());
                
                Logger.info('用户断开连接', { 
                    socketId: socket.id, 
                    username: user.name, 
                    reason: reason 
                });
            }
        } catch (error) {
            Logger.error('处理断开连接失败', { socketId: socket.id, error: error.message });
        }
    });
    
    // 处理错误
    socket.on('error', (error) => {
        Logger.error('Socket错误', { socketId: socket.id, error: error.message });
    });
});

// 全局错误处理
process.on('uncaughtException', (error) => {
    Logger.error('未捕获的异常', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('未处理的Promise拒绝', { reason: reason, promise: promise });
});

// 定期清理不活跃的用户
setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30分钟
    
    for (const [socketId, user] of users.entries()) {
        const lastActivity = new Date(user.lastActivity).getTime();
        if (now - lastActivity > inactiveThreshold) {
            Logger.warn('清理不活跃用户', { userId: socketId, username: user.name });
            removeUser(socketId);
            io.emit('usersUpdate', getUsersList());
        }
    }
}, 5 * 60 * 1000); // 每5分钟检查一次

// 定期清理打字指示器
setInterval(() => {
    const now = Date.now();
    for (const [socketId, typingInfo] of typingUsers.entries()) {
        if (now - typingInfo.timestamp > TYPING_TIMEOUT) {
            typingUsers.delete(socketId);
            io.emit('userStoppedTyping', { userId: socketId });
        }
    }
}, 1000); // 每秒检查一次

// 启动服务器
server.listen(PORT, () => {
    Logger.info(`聊天服务器启动成功`, { 
        port: PORT, 
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid
    });
    
    console.log(`
╔══════════════════════════════════════╗
║        实时文本聊天系统 - 优化版        ║
║                                      ║
║  🚀 服务器运行在: http://localhost:${PORT}  ║
║  📊 健康检查: http://localhost:${PORT}/health ║
║  📈 统计信息: http://localhost:${PORT}/api/stats ║
║                                      ║
║  ✨ 功能特性:                         ║
║  • 用户系统和头像                     ║
║  • 消息气泡和时间戳                   ║
║  • 打字指示器                        ║
║  • 表情符号支持                      ║
║  • 桌面通知                          ║
║  • 响应式设计                        ║
║  • 错误处理和日志                    ║
║                                      ║
╚══════════════════════════════════════╝
    `);
});

// 优雅关闭
process.on('SIGTERM', () => {
    Logger.info('收到SIGTERM信号，开始优雅关闭');
    server.close(() => {
        Logger.info('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    Logger.info('收到SIGINT信号，开始优雅关闭');
    server.close(() => {
        Logger.info('服务器已关闭');
        process.exit(0);
    });
});

module.exports = { app, server, io };