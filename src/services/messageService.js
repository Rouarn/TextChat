import Logger from './logger.js';
import config from '../../config/config.js';

export default class MessageService {
    constructor() {
        this.messages = [];
    }

    addMessage(message) {
        // 添加服务器时间戳
        message.serverTimestamp = new Date().toISOString();
        
        this.messages.push(message);
        
        // 限制消息数量
        if (this.messages.length > config.chat.maxMessages) {
            this.messages = this.messages.slice(-config.chat.maxMessages);
            Logger.info('消息数量超限，已清理旧消息');
        }
        
        Logger.info('新消息已添加', { 
            messageId: message.id, 
            userId: message.userId,
            username: message.username 
        });
    }

    getMessages() {
        return this.messages;
    }

    getMessagesCount() {
        return this.messages.length;
    }

    clearAllMessages() {
        const messageCount = this.messages.length;
        this.messages = [];
        Logger.info(`已清空所有消息，共${messageCount}条`);
    }
}