export const ORDER_SYNC_QUEUE = 'order-sync';

export const orderSyncQueueConfig = {
  name: 'order-sync',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
