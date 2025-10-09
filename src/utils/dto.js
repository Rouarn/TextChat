// DTO 映射工具（ESM）

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

export function toMessageDTO(message) {
  if (!message) return null;
  return {
    id: message.id,
    text: message.text,
    timestamp: message.timestamp || message.serverTimestamp,
    userId: message.userId,
    username: message.username,
    avatar: message.avatar,
  };
}