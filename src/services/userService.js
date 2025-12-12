// 用户服务：管理在线用户与打字状态，并提供清理策略
import Logger from './logger.js';
import { sanitizeUsername } from '../utils/helpers.js';
import { toUserDTO } from '../utils/dto.js';

export default class UserService {
    constructor() {
        this.users = new Map();
        this.typingUsers = new Map();
    }

    // 用户管理
    /**
     * 添加新用户（默认匿名头像与昵称）
     * @param {string} socketId
     * @param {{name?:string, avatar?:string}} userInfo
     */
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

    /** 移除用户并同步打字状态缓存 */
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

    /** 更新用户昵称与头像，并刷新活动时间 */
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

    /** 获取单个用户 */
    getUser(socketId) {
        return this.users.get(socketId);
    }

    /** 获取所有用户列表 */
    getUsersList() {
        return Array.from(this.users.values());
    }

    /** 在线用户数量 */
    getUsersCount() {
        return this.users.size;
    }

    // 打字指示器管理
    /** 设置用户打字状态（含时间戳） */
    setUserTyping(socketId, username) {
        this.typingUsers.set(socketId, {
            username: sanitizeUsername(username),
            timestamp: Date.now()
        });
    }

    /** 移除用户打字状态 */
    removeUserTyping(socketId) {
        this.typingUsers.delete(socketId);
    }

    /** 获取打字中的用户 Map */
    getTypingUsers() {
        return this.typingUsers;
    }

    // 清理不活跃用户
    /**
     * 移除超过不活跃阈值的用户并广播列表更新
     * @param {number} inactiveThreshold
     * @param {import('socket.io').Server} io
     */
    cleanupInactiveUsers(inactiveThreshold, io) {
        const now = Date.now();
        
        for (const [socketId, user] of this.users.entries()) {
            const lastActivity = new Date(user.lastActivity).getTime();
            if (now - lastActivity > inactiveThreshold) {
                Logger.warn('清理不活跃用户', { userId: socketId, username: user.name });
                this.removeUser(socketId);
                io.emit('users:update', this.getUsersList().map(toUserDTO));
            }
        }
    }

    // 清理过期的打字指示器
    /**
     * 移除超过时间阈值的打字状态并广播停止事件
     * @param {number} typingTimeout
     * @param {import('socket.io').Server} io
     */
    cleanupTypingIndicators(typingTimeout, io) {
        const now = Date.now();
        for (const [socketId, typingInfo] of this.typingUsers.entries()) {
            if (now - typingInfo.timestamp > typingTimeout) {
                this.typingUsers.delete(socketId);
                io.emit('typing:stop', { userId: socketId });
            }
        }
    }
}
