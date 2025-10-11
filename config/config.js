/*
 * 应用配置文件（ESM） - 纯静态配置
 *
 * 用途：集中管理服务端与客户端共享的运行时参数。
 * 注意：不应在此保存敏感信息（密钥、账号、数据库连接等）。
 *       如需动态配置，请使用环境变量或专用配置加载模块。
 * 生效：修改后需重启服务（或重新构建/部署）以生效。
 */

const config = {
  // 服务器配置：影响 HTTP/WS 服务器行为
  server: {
    port: 9765, // 服务器监听端口（HTTP / WebSocket）。生产环境通常由反向代理转发。
    trustProxy: false, // 开启后在反向代理（Nginx/Cloudflare）后读取真实客户端 IP（req.ip）。
    debug: false, // 是否输出详细错误栈与调试日志，仅在开发/排障时建议开启。
  },

  // 聊天配置：消息与用户状态的业务参数
  chat: {
    maxMessages: 1000, // 单个房间/频道保留的消息条数上限；超过后按“最早消息优先”淘汰。
    maxMessageLength: 1000, // 单条消息允许的最大字符数，用于防止滥用与异常负载。
    maxUsernameLength: 20, // 用户名最大长度；过长可能影响 UI 与日志可读性。
    typingTimeout: 3000, // 输入中状态（typing）的过期时间，单位毫秒；客户端击键会刷新此状态。
    userInactiveThreshold: 30 * 60 * 1000, // 判定用户为不活跃的时间窗口（毫秒），示例：30 分钟。
    cleanupInterval: 5 * 60 * 1000, // 后台清理任务的执行周期（毫秒），示例：5 分钟。
  },

  // 日志配置：输出位置与级别
  logging: {
    logToFile: false, // 是否写入到文件；生产建议开启并搭配日志轮转。
    logLevel: "info", // 日志级别："error" | "warn" | "info" | "debug"。
    logDir: "logs", // 文件日志目录（相对项目根目录），如 "logs/app.log"。
  },

  // CORS 配置：跨域访问控制
  cors: {
    origin: "*", // 允许的来源（Origin）。生产环境建议限定具体域名或域名列表。
    methods: ["GET", "POST"], // 允许的跨域 HTTP 方法。根据需要增减（如 PUT/DELETE）。
  },
};

export default config;
