# 实时文本聊天系统

一个基于 Node.js、Express 和 Socket.IO 的现代化实时聊天应用。

现已全面升级为 ESM（ECMAScript Modules）模块格式，脚本跨平台兼容。

## 功能特性

- 🚀 实时消息传输
- 👥 多用户在线聊天
- 📱 响应式设计，支持移动端
- 😊 表情符号支持
- 🔔 消息通知
- 🎵 提示音效
- 💾 消息历史记录
- ⌨️ 打字指示器
- 🎨 现代化 UI 设计

## 项目结构（当前）

```
real-time-text-chat/
├── config/
│   ├── config.js
│   ├── development.js
│   └── production.js
├── src/
│   ├── app.js              # 主应用（导出 startServer）
│   ├── server.js           # 服务器入口（ESM，调用 startServer）
│   ├── controllers/
│   │   └── socketController.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   ├── logger.js
│   │   ├── messageService.js
│   │   └── userService.js
│   └── utils/
│       ├── dto.js
│       ├── helpers.js
│       ├── rateLimiter.js
│       └── response.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       └── socketClient.js
├── .env.example
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## 快速开始

### 1. 安装依赖

使用 npm：
```bash
npm install
```

或使用 pnpm：
```bash
pnpm install
```

### 2. 启动应用

开发模式：
```bash
npm run dev
# 或
pnpm run dev
```

生产模式：
```bash
npm run prod
# 或
pnpm run prod
```

访问应用：打开浏览器访问 `http://localhost:3000`（可通过环境变量 `PORT` 修改端口）。

## 环境配置

项目不内置 `.env` 加载，请通过系统环境或命令行设置变量。`config/config.js` 会合并环境特定配置。

可用环境变量：

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `MAX_MESSAGES` | 最大消息数量 | `100` |
| `MAX_MESSAGE_LENGTH` | 最大消息长度 | `500` |
| `MAX_USERNAME_LENGTH` | 最大用户名长度 | `20` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_TO_FILE` | 是否记录到文件 | `false` |

环境特定：
- 开发环境（`development.js`）启用详细日志、较小消息缓存
- 生产环境（`production.js`）优化性能、支持代理

## 可用脚本

使用 npm：
- `npm run start` - 启动生产服务器
- `npm run dev` - 启动开发服务器
- `npm run prod` - 启动生产服务器

使用 pnpm：
- `pnpm start` - 启动生产服务器
- `pnpm run dev` - 启动开发服务器
- `pnpm run prod` - 启动生产服务器

> 注：当前项目未提供 `setup` 或 `clean` 脚本，`.env.example` 仅作参考。

## 技术栈

- 后端：Node.js (ESM)、Express、Socket.IO
- 前端：HTML5、CSS3、JavaScript (ES6+)
- 实时通信：WebSocket (Socket.IO)
- 样式：响应式设计、Flexbox/Grid

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- 常见移动端浏览器

## 开发说明

- 模块化设计：按功能分层组织代码
- 服务层：用户管理、消息处理、日志记录
- 控制器：Socket.IO 事件处理
- 配置管理：环境特定配置支持
- 工具函数：通用功能封装

## 事件契约（Socket.IO）

为确保前后端一致性，以下为统一的事件与负载结构（与当前实现完全一致）：

### 事件列表
- `users:update`：广播在线用户列表
  - 负载：`UserDTO[]`
- `user:joined`：某用户加入
  - 负载：`UserDTO`
- `user:left`：某用户离开
  - 负载：`string`（`userId`）
- `typing:start`：用户开始输入
  - 负载：`{ userId: string, username: string }`
- `typing:stop`：用户停止输入
  - 负载：`{ userId: string, username: string }`
- `message:history`：同步当前消息历史
  - 负载：`MessageDTO[]`
- `message:new`：新消息广播（服务器推送）
  - 负载：`{ message: MessageDTO, fromSelf: boolean }`
- `message:send`：发送消息（客户端 → 服务器）
  - 负载：`{ id: number, text: string, username: string, avatar: string, timestamp: string, userId: string, sessionId?: string, persistentUserId?: string }`
- `message:clear`：清空消息
  - 负载：`{}`（无负载）

### DTO 定义（参考 `src/utils/dto.js`）
- `UserDTO`
  - 字段：`id: string`、`name: string`、`avatar: string`
  - 可选：`joinTime?: string`、`lastActivity?: string`
- `MessageDTO`
  - 字段：`id: string`、`text: string`、`timestamp: string`、`userId: string`、`username: string`、`avatar: string`
  - 可选：`sessionId?: string`、`persistentUserId?: string`

> 说明：服务端会为内部消息添加 `serverTimestamp`，但在 `MessageDTO` 中以 `timestamp` 字段下发（优先客户端时间戳，否则使用服务器时间戳）。

## 交互流程示例

- 客户端初始化：连接后订阅 `message:history`、`users:update`，并在必要时发送 `user:update` 同步本地资料。
- 输入指示：输入时节流发送 `typing:start`，停止后延迟发送 `typing:stop`，减少抖动。
- 发送消息：客户端触发 `message:send`，后端校验并通过 `message:new` 广播（含 `fromSelf` 标记）。
- 清空消息：客户端触发 `message:clear`，服务端清理并广播空的 `message:history`。

## 约定与原则

- 事件命名使用 `:` 分隔语义层级，保持简洁一致。
- 负载中 ID 为字符串，时间戳统一使用 ISO 字符串。
- 所有广播负载均使用 DTO（服务端通过 `toUserDTO`、`toMessageDTO` 生成）。
- 客户端通过统一封装层（`public/js/socketClient.js`）进行 `emit/on/once` 调用。

## 更新日志

### v2.0.1
- 修复刷新后消息归属：`MessageDTO` 现包含 `sessionId` 与 `persistentUserId`，客户端可稳定识别“自己的消息”。

### v2.0.0
- 转为 ESM 模块格式
- 优化项目结构与配置加载
- 脚本跨平台（Windows/macOS/Linux）

### v1.0.0
- 基础聊天功能
- 实时消息传输
- 用户管理

## 许可证

MIT License