// 应用配置文件（ESM） - 纯静态配置

const config = {
  // 服务器配置
  server: {
    port: 9765,
    trustProxy: false,
    debug: false, // 是否输出详细错误信息等调试内容
  },

  // 聊天配置
  chat: {
    maxMessages: 1000,
    maxMessageLength: 1000,
    maxUsernameLength: 20,
    typingTimeout: 3000,
    userInactiveThreshold: 30 * 60 * 1000, // 30分钟
    cleanupInterval: 5 * 60 * 1000, // 5分钟
  },

  // 日志配置
  logging: {
    logToFile: false,
    logLevel: "info",
    logDir: "logs",
  },

  // CORS配置
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
};

export default config;
