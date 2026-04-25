export const RECONCILIATION_QUEUE = 'reconciliation';

export const reconciliationQueueConfig = {
  name: 'reconciliation',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
