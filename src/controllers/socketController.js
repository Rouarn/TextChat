import Logger from '../services/logger.js';
import { validateMessage, sanitizeMessage } from '../utils/helpers.js';
import config from '../../config/config.js';

export default class SocketController {
    constructor(userService, messageService) {
        this.userService = userService;
        this.messageService = messageService;
    }

    handleConnection(socket, io) {
        Logger.info('新的Socket连接', { socketId: socket.id });
        
        // 添加用户
        const user = this.userService.addUser(socket.id);
        
        try {
            // 发送历史消息
            socket.emit('messageHistory', this.messageService.getMessages());
            
            // 发送当前用户列表
            socket.emit('usersUpdate', this.userService.getUsersList());
            
            // 通知其他用户有新用户加入
            socket.broadcast.emit('userJoined', user);
            
            // 更新所有用户的在线用户列表
            io.emit('usersUpdate', this.userService.getUsersList());
            
        } catch (error) {
            Logger.error('发送初始数据失败', { socketId: socket.id, error: error.message });
        }

        // 绑定事件处理器
        this.bindEventHandlers(socket, io);
    }

    bindEventHandlers(socket, io) {
        // 处理用户信息更新
        socket.on('updateUser', (userInfo) => {
            this.handleUpdateUser(socket, io, userInfo);
        });

        // 处理发送消息
        socket.on('sendMessage', (messageData) => {
            this.handleSendMessage(socket, io, messageData);
        });

        // 处理打字指示器
        socket.on('typing', (data) => {
            this.handleTyping(socket, io, data);
        });

        socket.on('stopTyping', (data) => {
            this.handleStopTyping(socket, io, data);
        });

        // 处理清空消息
        socket.on('clearMessages', () => {
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

    handleUpdateUser(socket, io, userInfo) {
        try {
            const updatedUser = this.userService.updateUser(socket.id, userInfo);
            if (updatedUser) {
                // 通知所有用户更新用户列表
                io.emit('usersUpdate', this.userService.getUsersList());
            }
        } catch (error) {
            Logger.error('更新用户信息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '更新用户信息失败' });
        }
    }

    handleSendMessage(socket, io, messageData) {
        try {
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
    }

    handleTyping(socket, io, data) {
        try {
            const user = this.userService.getUser(socket.id);
            if (user && data.username) {
                this.userService.setUserTyping(socket.id, data.username);
                socket.broadcast.emit('userTyping', {
                    userId: socket.id,
                    username: data.username
                });

                // 设置超时清理
                setTimeout(() => {
                    const typingUsers = this.userService.getTypingUsers();
                    if (typingUsers.has(socket.id)) {
                        const typingInfo = typingUsers.get(socket.id);
                        if (Date.now() - typingInfo.timestamp >= config.chat.typingTimeout) {
                            this.userService.removeUserTyping(socket.id);
                            io.emit('userStoppedTyping', { userId: socket.id });
                        }
                    }
                }, config.chat.typingTimeout);
            }
        } catch (error) {
            Logger.error('处理打字指示器失败', { socketId: socket.id, error: error.message });
        }
    }

    handleStopTyping(socket, io, data) {
        try {
            this.userService.removeUserTyping(socket.id);
            socket.broadcast.emit('userStoppedTyping', {
                userId: socket.id
            });
        } catch (error) {
            Logger.error('停止打字指示器失败', { socketId: socket.id, error: error.message });
        }
    }

    handleClearMessages(socket, io) {
        try {
            const user = this.userService.getUser(socket.id);
            if (user) {
                this.messageService.clearAllMessages();
                io.emit('messageHistory', this.messageService.getMessages());
                Logger.info('用户清空了所有消息', { userId: socket.id, username: user.name });
            }
        } catch (error) {
            Logger.error('清空消息失败', { socketId: socket.id, error: error.message });
            socket.emit('error', { message: '清空消息失败' });
        }
    }

    handleDisconnect(socket, io, reason) {
        try {
            const user = this.userService.removeUser(socket.id);
            if (user) {
                // 通知其他用户有用户离开
                socket.broadcast.emit('userLeft', socket.id);
                
                // 更新所有用户的在线用户列表
                io.emit('usersUpdate', this.userService.getUsersList());
                
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