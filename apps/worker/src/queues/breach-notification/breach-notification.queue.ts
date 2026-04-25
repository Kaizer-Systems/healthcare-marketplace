export const BREACH_NOTIFICATION_QUEUE = 'breach-notification';

export const breachNotificationQueueConfig = {
  name: 'breach-notification',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
