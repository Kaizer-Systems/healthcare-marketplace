export const PROJECTIONS_QUEUE = 'projections';

export const projectionsQueueConfig = {
  name: 'projections',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
