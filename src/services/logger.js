// 轻量日志模块：支持控制台与可选文件输出，按级别过滤
import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * 判断是否应输出指定级别的日志
 * @param {'debug'|'info'|'warn'|'error'} level
 */
function shouldLog(level) {
  const configuredLevel = (config.logging.logLevel || config.logging.level || 'info').toLowerCase();
  const current = LEVELS[configuredLevel] ?? LEVELS.info;
  const incoming = LEVELS[level] ?? LEVELS.info;
  return incoming >= current;
}

/**
 * 解析日志目录（兼容 logDir 或 filePath）
 * - 若提供文件路径，则返回其所在目录
 */
function getLogDir() {
  // 支持 logDir 或 filePath 两种配置键
  const dirOrFile = config.logging.logDir || config.logging.filePath || 'logs/app.log';
  // 如果是文件路径，取其所在目录
  if (dirOrFile.endsWith('.log')) {
    return path.dirname(dirOrFile);
  }
  return dirOrFile;
}

export default class Logger {
  /**
   * 基础日志输出（控制台 + 可选文件）
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Object|null} data
   */
  static log(level, message, data = null) {
    if (!shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };

    // 控制台输出（简洁且可选数据）
    const payload = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${payload}`);

    // 可选：写入日志文件（支持 logToFile 或 toFile）
    const toFile = config.logging.logToFile || config.logging.toFile || false;
    if (toFile) {
      this.writeToFile(logEntry);
    }
  }

  static debug(message, data) {
    this.log('debug', message, data);
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

  /**
   * 写入日志到文件（按日期切分）
   * @param {{timestamp:string, level:string, message:string, data?:Object}} logEntry
   */
  static writeToFile(logEntry) {
    const logDir = path.join(process.cwd(), getLogDir());
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
