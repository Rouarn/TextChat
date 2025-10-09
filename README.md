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

## 项目结构

```
real-time-text-chat/
├── config/                 # 配置（ESM）
│   ├── config.js           # 主配置合并
│   ├── development.js      # 开发环境配置（默认导出）
│   └── production.js       # 生产环境配置（默认导出）
├── src/                    # 后端源代码（ESM）
│   ├── controllers/        # 控制器
│   │   └── socketController.js
│   ├── routes/            # 路由（默认导出）
│   │   └── api.js
│   ├── services/          # 服务层（默认导出）
│   │   ├── logger.js
│   │   ├── messageService.js
│   │   └── userService.js
│   ├── utils/             # 工具函数（命名导出）
│   │   └── helpers.js
│   └── app.js             # 主应用（导出startServer）
├── public/                # 静态资源
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       └── app.js         # 客户端脚本
├── logs/                  # 日志文件
├── .env.example           # 环境变量示例
├── server.js              # 服务器入口（ESM，调用startServer）
├── index.html             # 客户端页面
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
pnpm run setup
```

编辑 `.env` 文件设置您的配置。

### 3. 启动应用

#### 开发模式
```bash
pnpm run dev
```

#### 生产模式
```bash
pnpm run prod
```

> 提示：项目采用 ESM，所有后端文件使用 `import/export`，无需 CommonJS。

### 4. 访问应用

打开浏览器访问 `http://localhost:3000`

## 环境配置

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `MAX_MESSAGES` | 最大消息数量 | `100` |
| `MAX_MESSAGE_LENGTH` | 最大消息长度 | `500` |
| `MAX_USERNAME_LENGTH` | 最大用户名长度 | `20` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_TO_FILE` | 是否记录到文件 | `false` |

### 环境特定配置

- **开发环境** (`development.js`): 详细日志、较少消息缓存
- **生产环境** (`production.js`): 优化性能、支持代理

## 可用脚本

- `pnpm start` - 启动生产服务器
- `pnpm run dev` - 启动开发服务器
- `pnpm run prod` - 启动生产服务器
- `pnpm run clean` - 清理日志文件（跨平台）
- `pnpm run setup` - 复制环境变量文件（跨平台）

## 技术栈

- **后端**: Node.js (ESM), Express.js, Socket.IO
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **实时通信**: WebSocket (Socket.IO)
- **样式**: 响应式设计, CSS Grid/Flexbox

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- 移动端浏览器

## 开发说明

### 代码结构

- **模块化设计**: 按功能分离代码
- **服务层**: 用户管理、消息处理、日志记录
- **控制器**: Socket.IO 事件处理
- **配置管理**: 环境特定配置支持
- **工具函数**: 通用功能封装

### 扩展功能

项目采用模块化设计，便于扩展：

- 添加新的消息类型
- 集成数据库存储
- 实现用户认证
- 添加聊天室功能
- 集成文件上传

## 许可证

MIT License

## 更新日志

### v2.0.0
- 转为 ESM 模块格式
- 优化项目结构与配置加载
- 脚本跨平台（Windows/macOS/Linux）
- 保持原有功能与接口一致

### v1.0.0
- 基础聊天功能
- 实时消息传输
- 用户管理