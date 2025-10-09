import config from '../../config/config.js';

// 消息处理工具
export function sanitizeMessage(text) {
    if (typeof text !== 'string') return '';
    return text.trim().substring(0, config.chat.maxMessageLength);
}

export function sanitizeUsername(name) {
    if (typeof name !== 'string') return '匿名用户';
    return name.trim().substring(0, config.chat.maxUsernameLength) || '匿名用户';
}

export function generateUserId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: '无效的消息格式' };
    }
    
    if (!message.text || typeof message.text !== 'string') {
        return { valid: false, error: '消息内容不能为空' };
    }
    
    if (message.text.length > config.chat.maxMessageLength) {
        return { valid: false, error: `消息长度不能超过${config.chat.maxMessageLength}字符` };
    }
    
    return { valid: true };
}