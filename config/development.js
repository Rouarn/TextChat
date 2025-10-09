// 开发环境配置（ESM）
export default {
  server: {
    port: process.env.PORT || 3000,
    trustProxy: false,
  },
  
  chat: {
    maxMessages: 50, // 开发环境减少消息数量
    maxMessageLength: 500,
    maxUsernameLength: 20,
    typingTimeout: 3000,
    cleanupInterval: 60000, // 开发环境更频繁清理
  },
  
  logging: {
    level: 'debug', // 开发环境详细日志
    toFile: false,
    filePath: './logs/dev.log',
  },
  
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
};