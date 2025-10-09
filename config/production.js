// 生产环境配置（ESM）
export default {
  server: {
    port: process.env.PORT || 3000,
    trustProxy: true, // 生产环境通常在代理后面
  },
  
  chat: {
    maxMessages: parseInt(process.env.MAX_MESSAGES) || 100,
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 500,
    maxUsernameLength: parseInt(process.env.MAX_USERNAME_LENGTH) || 20,
    typingTimeout: parseInt(process.env.TYPING_TIMEOUT) || 3000,
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 300000,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    toFile: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      (process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(',')) : 
      false,
    methods: process.env.CORS_METHODS ? 
      process.env.CORS_METHODS.split(',') : 
      ['GET', 'POST'],
    credentials: false,
  },
};