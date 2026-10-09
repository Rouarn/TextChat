# 实时文本聊天系统 v3

一个基于 Node.js、Express、Socket.IO 的实时聊天应用，前后端统一使用
`@vakao-ui/socket-system`（npm 正式发布包）作为 Socket 层。

## 功能特性

- 实时消息传输（标准化消息协议，带服务端应答）
- 在线用户列表与用户昵称/头像
- 打字指示器（支持多人）
- 消息历史记录（入房自动下发）
- 一键清空聊天记录
- 表情选择、消息提示音、桌面通知
- 断线自动重连与房间恢复（库内置）
- 响应式设计，支持移动端

## 项目结构

```
text-chat/
├── config/
│   └── config.js            # 静态配置（端口、聊天参数）
├── src/
│   ├── server.js            # 入口：调用 startServer()
│   ├── app.js               # 装配 Express / Socket.IO / ChatServer
│   └── chat/
│       └── ChatServer.js    # 后端唯一的 Socket 业务模块（协议实现）
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── assets/
│   ├── js/
│   │   └── app.js           # 前端唯一模块
│   └── vendor/
│       └── socket-system.bundle.js  # 库 + socket.io-client 的预打包 ESM
├── vendor/
│   └── entry.js             # esbuild 打包入口
└── package.json
```

## 快速开始

前置条件：Node.js >= 18。

```bash
pnpm install
pnpm start
```

> `public/vendor/socket-system.bundle.js` 是随仓库提交的预打包产物，无需重新生成。
> 仅当升级 `@vakao-ui/socket-system` 后，执行 `pnpm run vendor` 刷新它。

访问 http://localhost:9765。

## 配置

所有配置均在 [config/config.js](config/config.js)：

- `server.port`：服务端口（默认 9765）
- `chat.roomId`：聊天房间 ID（默认 `lobby`）
- `chat.maxMessages`：历史消息上限
- `chat.maxMessageLength` / `chat.maxUsernameLength`：长度限制
- `chat.offlineGraceMs`：断线宽限期，期间内重连不判定离线

## 通信协议

标准命令（库协议，带 ack：`{ success, error?, data? }`）：

| 方向  | 事件           | 负载                                                     |
| ----- | -------------- | -------------------------------------------------------- |
| C → S | `join-room`    | `{ roomId, userId }`                                     |
| C → S | `leave-room`   | `{ roomId, userId }`                                     |
| C → S | `send-message` | `MessageData { id, room, content, ts, sender }`          |
| C → S | `get-rooms`    | —，应答 `data.rooms: ServerRoomItem[]`                   |
| S → C | `message`      | `MessageData`（本应用附加 `username`/`avatar` 展示字段） |

应用扩展事件：

| 方向  | 事件                           | 负载                                |
| ----- | ------------------------------ | ----------------------------------- |
| C → S | `profile:update`               | `{ name, avatar }`                  |
| C → S | `typing:start` / `typing:stop` | `{ userId, username }`              |
| C → S | `messages:clear`               | `{ room }`                          |
| S → C | `presence:update`              | `{ users: [{ id, name, avatar }] }` |
| S → C | `history`                      | `MessageData[]`                     |

## 身份模型

客户端生成一个稳定的 `userId` 并持久化在 `localStorage`；
消息归属由 `MessageData.sender === userId` 判定，无需 session 补丁字段。

## 许可证

MIT
