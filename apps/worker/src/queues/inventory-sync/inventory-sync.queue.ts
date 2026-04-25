export const INVENTORY_SYNC_QUEUE = 'inventory-sync';

export const inventorySyncQueueConfig = {
  name: 'inventory-sync',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
