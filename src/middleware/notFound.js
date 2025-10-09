// 404 未找到处理中间件（ESM）
export default function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: '资源未找到'
  });
}