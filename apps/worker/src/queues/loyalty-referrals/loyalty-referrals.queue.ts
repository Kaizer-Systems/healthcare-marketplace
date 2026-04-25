export const LOYALTY_REFERRALS_QUEUE = 'loyalty-referrals';

export const loyaltyReferralsQueueConfig = {
  name: 'loyalty-referrals',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
