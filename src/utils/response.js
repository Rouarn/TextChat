// 统一响应格式助手（ESM）
export function ok(data, meta = null) {
  const payload = { success: true, data };
  if (meta && typeof meta === 'object') payload.meta = meta;
  return payload;
}

export function fail(code, message, details = null) {
  const payload = { success: false, error: { code, message } };
  if (details && typeof details === 'object') payload.error.details = details;
  return payload;
}