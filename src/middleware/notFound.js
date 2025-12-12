// 404 未找到处理中间件（ESM）
/**
 * 返回统一的 404 JSON 响应
 * 保持与全局响应结构一致
 */
export default function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: '资源未找到'
  });
}
