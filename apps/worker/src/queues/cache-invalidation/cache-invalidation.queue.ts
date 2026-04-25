export const CACHE_INVALIDATION_QUEUE = 'cache-invalidation';

export const cacheInvalidationQueueConfig = {
  name: 'cache-invalidation',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
