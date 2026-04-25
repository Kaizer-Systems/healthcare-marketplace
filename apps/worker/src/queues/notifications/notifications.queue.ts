export const NOTIFICATIONS_QUEUE = 'notifications';

export const notificationsQueueConfig = {
  name: 'notifications',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
