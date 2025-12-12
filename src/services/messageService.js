// 消息服务：负责消息存储、裁剪与统计
import Logger from './logger.js';
import config from '../../config/config.js';

export default class MessageService {
    constructor() {
        this.messages = [];
    }

    /**
     * 添加消息并根据配置裁剪旧消息
     * @param {Object} message
     */
    addMessage(message) {
        // 添加服务器时间戳
        message.serverTimestamp = new Date().toISOString();
        
        this.messages.push(message);
        
        // 限制消息数量
        if (this.messages.length > config.chat.maxMessages) {
            const overflow = this.messages.length - config.chat.maxMessages;
            this.messages.splice(0, overflow);
            Logger.info('消息数量超限，已清理旧消息', { removed: overflow });
        }
        
        Logger.info('新消息已添加', { 
            messageId: message.id, 
            userId: message.userId,
            username: message.username 
        });
    }

    /** 获取全部消息（引用数组） */
    getMessages() {
        return this.messages;
    }

    /** 获取消息数量 */
    getMessagesCount() {
        return this.messages.length;
    }

    /** 清空所有消息并记录日志 */
    clearAllMessages() {
        const messageCount = this.messages.length;
        this.messages = [];
        Logger.info(`已清空所有消息，共${messageCount}条`);
    }
}
