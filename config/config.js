// 应用配置文件（ESM）
import path from 'node:path';
import development from './development.js';
import production from './production.js';

// 获取环境
const env = process.env.NODE_ENV || 'development';

// 基础配置
const baseConfig = {
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },

    // 聊天配置
    chat: {
        maxMessages: 1000,
        maxMessageLength: 1000,
        maxUsernameLength: 20,
        typingTimeout: 3000,
        userInactiveThreshold: 30 * 60 * 1000, // 30分钟
        cleanupInterval: 5 * 60 * 1000 // 5分钟
    },

    // 日志配置
    logging: {
        logToFile: process.env.LOG_TO_FILE === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        logDir: 'logs'
    },

    // CORS配置
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
};

// 加载环境特定配置（静态导入，避免动态require）
const envConfig = env === 'production' ? production : development;

// 深度合并配置
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

export default deepMerge(baseConfig, envConfig);