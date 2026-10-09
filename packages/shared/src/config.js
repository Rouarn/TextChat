/*
 * 应用配置（ESM）- 纯静态配置，前后端共享。
 * 修改后需重启服务生效。
 */

const config = {
  // 服务器配置
  server: {
    port: 9765, // HTTP / WebSocket 监听端口
    frontendPort: 9766, // Vite 开发服务器端口
  },

  // 聊天配置
  chat: {
    roomId: 'lobby', // 全站唯一聊天房间 ID
    maxMessages: 1000, // 历史消息保留条数上限，超出后淘汰最早消息
    maxMessageLength: 1000, // 单条消息最大字符数
    maxUsernameLength: 20, // 昵称最大字符数
    offlineGraceMs: 5000, // 断线宽限期：期间内重连不判定为离线
  },

  // 默认昵称与头像
  defaults: {
    name: '匿名用户',
    avatar: 'U',
  },
};

export default config;
