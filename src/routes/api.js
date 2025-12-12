// REST API 路由：提供健康检查与统计数据
import express from 'express';
import { ok } from '../utils/response.js';
const router = express.Router();

// 健康检查端点：返回时间、运行时长、用户与消息数量
router.get('/health', (req, res) => {
    const { userService, messageService } = req.app.locals;
    const data = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users: userService ? userService.getUsersCount() : 0,
        messages: messageService ? messageService.getMessagesCount() : 0
    };
    res.json(ok(data));
});

// 统计信息端点：在线用户、总消息数、打字中用户数量、运行时长
router.get('/stats', (req, res) => {
    const { userService, messageService } = req.app.locals;
    const data = {
        onlineUsers: userService ? userService.getUsersCount() : 0,
        totalMessages: messageService ? messageService.getMessagesCount() : 0,
        typingUsers: userService ? userService.getTypingUsers().size : 0,
        uptime: process.uptime()
    };
    res.json(ok(data));
});

export default router;
