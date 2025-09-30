const Logger = require('./logger');
const { sanitizeUsername } = require('../utils/helpers');

class UserService {
    constructor() {
        this.users = new Map();
        this.typingUsers = new Map();
    }

    // 用户管理
    addUser(socketId, userInfo = {}) {
        const user = {
            id: socketId,
            socketId: socketId,
            name: sanitizeUsername(userInfo.name) || '匿名用户',
            avatar: userInfo.avatar || 'U',
            joinTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        
        this.users.set(socketId, user);
        Logger.info('用户加入', { userId: socketId, username: user.name });
        return user;
    }

    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            this.users.delete(socketId);
            this.typingUsers.delete(socketId);
            Logger.info('用户离开', { userId: socketId, username: user.name });
            return user;
        }
        return null;
    }

    updateUser(socketId, userInfo) {
        const user = this.users.get(socketId);
        if (user) {
            user.name = sanitizeUsername(userInfo.name) || user.name;
            user.avatar = userInfo.avatar || user.avatar;
            user.lastActivity = new Date().toISOString();
            this.users.set(socketId, user);
            Logger.info('用户信息更新', { userId: socketId, username: user.name });
            return user;
        }
        return null;
    }

    getUser(socketId) {
        return this.users.get(socketId);
    }

    getUsersList() {
        return Array.from(this.users.values());
    }

    getUsersCount() {
        return this.users.size;
    }

    // 打字指示器管理
    setUserTyping(socketId, username) {
        this.typingUsers.set(socketId, {
            username: sanitizeUsername(username),
            timestamp: Date.now()
        });
    }

    removeUserTyping(socketId) {
        this.typingUsers.delete(socketId);
    }

    getTypingUsers() {
        return this.typingUsers;
    }

    // 清理不活跃用户
    cleanupInactiveUsers(inactiveThreshold, io) {
        const now = Date.now();
        
        for (const [socketId, user] of this.users.entries()) {
            const lastActivity = new Date(user.lastActivity).getTime();
            if (now - lastActivity > inactiveThreshold) {
                Logger.warn('清理不活跃用户', { userId: socketId, username: user.name });
                this.removeUser(socketId);
                io.emit('usersUpdate', this.getUsersList());
            }
        }
    }

    // 清理过期的打字指示器
    cleanupTypingIndicators(typingTimeout, io) {
        const now = Date.now();
        for (const [socketId, typingInfo] of this.typingUsers.entries()) {
            if (now - typingInfo.timestamp > typingTimeout) {
                this.typingUsers.delete(socketId);
                io.emit('userStoppedTyping', { userId: socketId });
            }
        }
    }
}

module.exports = UserService;