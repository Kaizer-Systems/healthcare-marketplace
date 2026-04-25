export const workerConfig = () => ({
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  runtimeMode: process.env.APP_RUNTIME_MODE ?? 'dev-integrated',
  queueMode: process.env.QUEUE_MODE ?? 'redis',
});
