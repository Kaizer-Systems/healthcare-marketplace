export const CONSENT_LIFECYCLE_QUEUE = 'consent-lifecycle';

export const consentLifecycleQueueConfig = {
  name: 'consent-lifecycle',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
