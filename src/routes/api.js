import express from 'express';
const router = express.Router();

// 健康检查端点
router.get('/health', (req, res) => {
    const { userService, messageService } = req.app.locals;
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users: userService ? userService.getUsersCount() : 0,
        messages: messageService ? messageService.getMessagesCount() : 0
    });
});

// 统计信息端点
router.get('/stats', (req, res) => {
    const { userService, messageService } = req.app.locals;
    
    res.json({
        onlineUsers: userService ? userService.getUsersCount() : 0,
        totalMessages: messageService ? messageService.getMessagesCount() : 0,
        typingUsers: userService ? userService.getTypingUsers().size : 0,
        uptime: process.uptime()
    });
});

export default router;