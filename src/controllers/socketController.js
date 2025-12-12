// Socket 控制器：集中处理所有 Socket.IO 事件与业务逻辑
import Logger from '../services/logger.js';
import { validateMessage, sanitizeMessage } from '../utils/helpers.js';
import { createRateLimiter } from '../utils/rateLimiter.js';
import { toUserDTO, toMessageDTO } from '../utils/dto.js';
import config from '../../config/config.js';

/**
 * SocketController
 * - 负责用户加入/离开、消息发送、打字指示、列表更新等实时事件
 * - 提供速率限制、DTO 映射与统一错误日志
 */
export default class SocketController {
    constructor(userService, messageService) {
        this.userService = userService;
        this.messageService = messageService;
        // 消息速率限制器：窗口与最大值来自配置或默认值
        this.messageLimiter = createRateLimiter({
            windowMs: (config.chat && config.chat.rateLimitWindowMs) || 3000,
            max: (config.chat && config.chat.rateLimitMax) || 10
        });
    }

    /**
     * 处理新连接：发送初始数据并绑定事件
     * @param {import('socket.io').Socket} socket
     * @param {import('socket.io').Server} io
     */
    handleConnection(socket, io) {
        Logger.info('新的Socket连接', { socketId: socket.id });
        
        // 添加用户
        const user = this.userService.addUser(socket.id);
        
        try {
            // 发送历史消息（DTO）
            socket.emit('message:history', this.messageService.getMessages().map(toMessageDTO));

            // 发送当前用户列表（DTO）
            socket.emit('users:update', this.userService.getUsersList().map(toUserDTO));

            // 通知其他用户有新用户加入（DTO）
            socket.broadcast.emit('user:joined', toUserDTO(user));

            // 更新所有用户的在线用户列表（DTO）
            io.emit('users:update', this.userService.getUsersList().map(toUserDTO));
            
        } catch (error) {
            Logger.error('发送初始数据失败', { socketId: socket.id, error: error.message });
        }

        // 绑定事件处理器
        this.bindEventHandlers(socket, io);
    }

    /**
     * 绑定该 socket 的所有事件处理器
     * @param {import('socket.io').Socket} socket
     * @param {import('socket.io').Server} io
     */
    bindEventHandlers(socket, io) {
        // 处理用户信息更新
        socket.on('user:update', (userInfo) => {
            this.handleUpdateUser(socket, io, userInfo);
        });

        // 处理发送消息
        socket.on('message:send', (messageData) => {
            this.handleSendMessage(socket, io, messageData);
        });

        // 处理打字指示器
        socket.on('typing:start', (data) => {
            this.handleTyping(socket, io, data);
        });

        socket.on('typing:stop', (data) => {
            this.handleStopTyping(socket, io, data);
        });

        // 处理清空消息
        socket.on('message:clear', () => {
            this.handleClearMessages(socket, io);
        });

        // 处理断开连接
        socket.on('disconnect', (reason) => {
            this.handleDisconnect(socket, io, reason);
        });

        // 处理错误
        socket.on('error', (error) => {
            Logger.error('Socket错误', { socketId: socket.id, error: error.message });
        });
    }

    /**
     * 更新用户信息并广播最新用户列表
     */
    handleUpdateUser(socket, io, userInfo) {
        try {
            const updatedUser = this.userService.updateUser(socket.id, userInfo);
            if (updatedUser) {
                // 通知所有用户更新用户列表
                io.emit('users:update', this.userService.getUsersList().map(toUserDTO));
            }
        } catch (error) {
            Logger.error('更新用户信息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '更新用户信息失败' });
        }
    }

    /**
     * 处理发送消息：速率限制、验证与广播
     */
    handleSendMessage(socket, io, messageData) {
        try {
            // 速率限制检查
            if (!this.messageLimiter(socket.id)) {
                socket.emit('error', { message: '发送过于频繁，请稍后再试' });
                return;
            }
            // 验证消息
            const validation = validateMessage(messageData);
            if (!validation.valid) {
                socket.emit('error', { message: validation.error });
                return;
            }
            
            // 获取用户信息
            const user = this.userService.getUser(socket.id);
            Logger.info('发送消息时的用户信息', { 
                socketId: socket.id, 
                user: user,
                messageData: { 
                    userId: messageData.userId, 
                    username: messageData.username 
                }
            });
            
            if (!user) {
                socket.emit('error', { message: '用户信息不存在' });
                return;
            }
            
            // 创建消息对象
            const message = {
                id: messageData.id || (Date.now() + Math.random()),
                text: sanitizeMessage(messageData.text),
                timestamp: messageData.timestamp || new Date().toISOString(),
                userId: user.id,
                username: user.name,
                avatar: user.avatar,
                sessionId: messageData.sessionId || null,
                persistentUserId: messageData.persistentUserId || null
            };
            
            // 添加到消息列表
            this.messageService.addMessage(message);
            
            // 发送给发送者（标记为自己发送的）
            socket.emit('message:new', {
                message: toMessageDTO(message),
                fromSelf: true
            });

            // 广播给其他用户（标记为他人发送的）
            socket.broadcast.emit('message:new', {
                message: toMessageDTO(message),
                fromSelf: false
            });
            
            // 更新用户活动时间
            user.lastActivity = new Date().toISOString();
            
        } catch (error) {
            Logger.error('处理消息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '发送消息失败' });
        }
    }

    /** 处理打字开始事件并广播 */
    handleTyping(socket, io, data) {
        try {
            const user = this.userService.getUser(socket.id);
            if (user && data.username) {
                this.userService.setUserTyping(socket.id, data.username);
                socket.broadcast.emit('typing:start', {
                    userId: socket.id,
                    username: data.username
                });
            }
        } catch (error) {
            Logger.error('处理打字指示器失败', { socketId: socket.id, error: error.message });
        }
    }

    /** 处理打字停止事件并广播 */
    handleStopTyping(socket, io, data) {
        try {
            this.userService.removeUserTyping(socket.id);
            socket.broadcast.emit('typing:stop', {
                userId: socket.id
            });
        } catch (error) {
            Logger.error('停止打字指示器失败', { socketId: socket.id, error: error.message });
        }
    }

    /** 清空所有消息并广播最新历史消息 */
    handleClearMessages(socket, io) {
        try {
            const user = this.userService.getUser(socket.id);
            if (user) {
                this.messageService.clearAllMessages();
                io.emit('message:history', this.messageService.getMessages().map(toMessageDTO));
                Logger.info('用户清空了所有消息', { userId: socket.id, username: user.name });
            }
        } catch (error) {
            Logger.error('清空消息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '清空消息失败' });
        }
    }

    /**
     * 处理断开连接：移除用户、更新列表并记录日志
     */
    handleDisconnect(socket, io, reason) {
        try {
            const user = this.userService.removeUser(socket.id);
            if (user) {
                // 通知其他用户有用户离开
                socket.broadcast.emit('user:left', socket.id);

                // 更新所有用户的在线用户列表
                io.emit('users:update', this.userService.getUsersList().map(toUserDTO));
                
                Logger.info('用户断开连接', { 
                    socketId: socket.id, 
                    username: user.name, 
                    reason: reason 
                });
            }
        } catch (error) {
            Logger.error('处理断开连接失败', { socketId: socket.id, error: error.message });
        }
    }
}
