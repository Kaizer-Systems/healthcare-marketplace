export const appConfig = () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  runtimeMode: process.env.APP_RUNTIME_MODE ?? 'dev-lite',
  mongodb: { uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grip-health' },
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
});
