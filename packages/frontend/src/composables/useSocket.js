import { createSocket } from '@vakao-ui/socket-system';
import { ExtensionEvent, config } from '@text-chat/shared';
import { useChat } from './useChat';
import { useSettings } from './useSettings';

let socket = null;

export function useSocket() {
  const chat = useChat();
  const { settings } = useSettings();

  function start(room = config.chat.roomId) {
    socket = createSocket({
      url: window.location.origin,
      userId: settings.userId,
      timeout: 20000,
    });

    // 库标准事件
    socket.onStateChange((info) => chat.setConnection(info));
    socket.onMessage((message) => chat.addMessage(message));
    socket.onError((error) =>
      console.error('[socket] 后台错误:', error.type, error.message),
    );
    socket.on('reconnecting', (attempt) => chat.setReconnecting(attempt));

    // 应用扩展事件
    socket.on(ExtensionEvent.History, (messages) => chat.setHistory(messages));
    socket.on(ExtensionEvent.PresenceUpdate, (data) =>
      chat.setOnlineUsers(data?.users ?? []),
    );
    socket.on(ExtensionEvent.TypingStart, (data) => chat.addTypingUser(data));
    socket.on(ExtensionEvent.TypingStop, (data) => chat.removeTypingUser(data));

    // 入房成功（含断线重连后的房间自动恢复）：重新同步昵称/头像
    socket.on('roomJoined', () => pushProfile());

    return socket.connect().then(() => socket.joinRoom(room, settings.userId));
  }

  function send(room, text) {
    return socket.sendMessage(room, text);
  }

  function pushProfile() {
    if (!socket) return;
    socket.emit(ExtensionEvent.ProfileUpdate, {
      name: settings.name,
      avatar: settings.avatar,
    });
  }

  function setTyping(isStart) {
    if (!socket) return;
    socket.emit(
      isStart ? ExtensionEvent.TypingStart : ExtensionEvent.TypingStop,
      {
        userId: settings.userId,
        username: settings.name,
      },
    );
  }

  function clearHistory(room) {
    if (!socket) return;
    socket.emit(ExtensionEvent.MessagesClear, { room });
  }

  return { start, send, pushProfile, setTyping, clearHistory };
}
