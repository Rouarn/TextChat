// 全局错误处理中间件（ESM）
/**
 * 统一错误响应：
 * - 生产环境隐藏堆栈信息
 * - 开发环境根据配置输出详情
 */
import { fail } from '../utils/response.js';
import config from '../../config/config.js';

export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || '服务器内部错误';
  // 是否输出详细错误由静态配置控制
  const isDev = !!(config.server && config.server.debug);
  const details = isDev ? { stack: err.stack } : undefined;
  res.status(status).json(fail(status, message, details));
}
