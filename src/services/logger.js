import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/config.js';

export default class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        
        // 可选：写入日志文件
        if (config.logging.logToFile) {
            this.writeToFile(logEntry);
        }
    }
    
    static info(message, data) {
        this.log('info', message, data);
    }
    
    static warn(message, data) {
        this.log('warn', message, data);
    }
    
    static error(message, data) {
        this.log('error', message, data);
    }
    
    static writeToFile(logEntry) {
        const logDir = path.join(__dirname, '../../', config.logging.logDir);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `chat-${new Date().toISOString().split('T')[0]}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFile(logFile, logLine, (err) => {
            if (err) console.error('写入日志文件失败:', err);
        });
    }
}