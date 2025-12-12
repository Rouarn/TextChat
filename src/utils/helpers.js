// 文本与消息相关的通用工具函数
import config from '../../config/config.js';

// 消息处理工具
/** 规范化消息文本，移除多余空白并限制长度 */
export function sanitizeMessage(text) {
    if (typeof text !== 'string') return '';
    return text.trim().substring(0, config.chat.maxMessageLength);
}

/** 规范化用户名，移除空白、限制长度并提供默认值 */
export function sanitizeUsername(name) {
    if (typeof name !== 'string') return '匿名用户';
    return name.trim().substring(0, config.chat.maxUsernameLength) || '匿名用户';
}

/** 生成随机用户ID（客户端侧不使用，该函数可用于测试或扩展） */
export function generateUserId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * 验证消息对象结构与长度约束
 * @param {Object} message
 * @returns {{valid:boolean,error?:string}}
 */
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
