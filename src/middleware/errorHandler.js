// 全局错误处理中间件（ESM）
export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || '服务器内部错误';
  // 仅在开发模式输出详细错误
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const payload = {
    status: 'error',
    code: status,
    message,
    ...(isDev && { stack: err.stack })
  };
  res.status(status).json(payload);
}