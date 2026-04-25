import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(url?: string): Redis {
  if (!redisClient) {
    redisClient = new Redis(url ?? process.env.REDIS_URL ?? 'redis://localhost:6379');
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
