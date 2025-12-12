// DTO 映射工具（ESM）
/**
 * 用户对象 → 传输对象（剔除非必要字段）
 * @param {Object} user
 * @returns {{id:string,name:string,avatar:string,joinTime:string,lastActivity:string}|null}
 */

export function toUserDTO(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    joinTime: user.joinTime,
    lastActivity: user.lastActivity,
  };
}

/**
 * 消息对象 → 传输对象（保留客户端归属判断字段）
 * @param {Object} message
 * @returns {{id:string,text:string,timestamp:string,userId:string,username:string,avatar:string,sessionId:string|null,persistentUserId:string|null}|null}
 */
export function toMessageDTO(message) {
  if (!message) return null;
  return {
    id: message.id,
    text: message.text,
    timestamp: message.timestamp || message.serverTimestamp,
    userId: message.userId,
    username: message.username,
    avatar: message.avatar,
    // 保留用于客户端归属判断的稳定字段
    sessionId: message.sessionId || null,
    persistentUserId: message.persistentUserId || null,
  };
}
