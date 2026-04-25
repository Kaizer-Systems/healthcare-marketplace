export const DSR_FULFILMENT_QUEUE = 'dsr-fulfilment';

export const dsrFulfilmentQueueConfig = {
  name: 'dsr-fulfilment',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
};
