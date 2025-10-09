// 全局错误处理中间件（ESM）
import { fail } from '../utils/response.js';

export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || '服务器内部错误';
  // 仅在开发模式输出详细错误
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const details = isDev ? { stack: err.stack } : undefined;
  res.status(status).json(fail(status, message, details));
}