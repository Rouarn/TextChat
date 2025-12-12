// 统一响应格式助手（ESM）
/**
 * 成功响应包装
 * @param {any} data
 * @param {Object|null} meta
 * @returns {{success:true,data:any,meta?:Object}}
 */
export function ok(data, meta = null) {
  const payload = { success: true, data };
  if (meta && typeof meta === 'object') payload.meta = meta;
  return payload;
}

/**
 * 失败响应包装
 * @param {number} code
 * @param {string} message
 * @param {Object|null} details
 * @returns {{success:false,error:{code:number,message:string,details?:Object}}}
 */
export function fail(code, message, details = null) {
  const payload = { success: false, error: { code, message } };
  if (details && typeof details === 'object') payload.error.details = details;
  return payload;
}
