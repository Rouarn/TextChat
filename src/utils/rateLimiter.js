// 简单的令牌桶/滑动窗口速率限制器（ESM）
// 使用方式：
// const limiter = createRateLimiter({ windowMs: 3000, max: 10 });
// const allow = limiter(key); // 返回 true/false
export function createRateLimiter({ windowMs = 3000, max = 10 } = {}) {
  const hits = new Map();

  /**
   * 对某个 key 进行速率检查
   * @param {string} key
   * @returns {boolean} 是否允许
   */
  return function (key) {
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket) {
      bucket = { count: 0, start: now };
      hits.set(key, bucket);
    }

    // 窗口过期则重置
    if (now - bucket.start >= windowMs) {
      bucket.count = 0;
      bucket.start = now;
    }

    bucket.count += 1;
    return bucket.count <= max;
  };
}
