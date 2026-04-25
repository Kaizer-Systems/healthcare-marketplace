export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export async function checkRateLimit(
  _identifier: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number }> {
  return { allowed: true, remaining: config.maxRequests };
}
