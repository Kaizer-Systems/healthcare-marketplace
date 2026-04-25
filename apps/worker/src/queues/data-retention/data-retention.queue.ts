export const DATA_RETENTION_QUEUE = 'data-retention';

export const dataRetentionQueueConfig = {
  name: 'data-retention',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
