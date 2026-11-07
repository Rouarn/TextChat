/*
 * 库协议之外的本应用扩展事件（前后端共享，需保持一致）。
 *
 * 库标准事件（由 @vakao/socket-system 定义）：
 *   ClientCommand: join-room / leave-room / send-message / get-rooms
 *   SocketEvent:   message
 *
 * 以下为本应用在库协议之上扩展的自定义事件：
 */
export const ExtensionEvent = {
  ProfileUpdate: 'profile:update', // 客户端 -> 服务端，更新昵称/头像
  PresenceUpdate: 'presence:update', // 服务端 -> 客户端，在线用户列表
  History: 'history', // 服务端 -> 客户端，入房后下发的消息历史
  TypingStart: 'typing:start', // 打字指示，服务端仅转发给房间内其他人
  TypingStop: 'typing:stop',
  MessagesClear: 'messages:clear', // 客户端 -> 服务端，清空历史
};
