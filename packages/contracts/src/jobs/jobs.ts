export type JobPayload<T = unknown> = {
  jobId: string;
  type: string;
  data: T;
  retryCount: number;
  createdAt: Date;
};

export const QUEUE_ORDER_SYNC = 'order-sync' as const;
export const QUEUE_INVENTORY_SYNC = 'inventory-sync' as const;
export const QUEUE_NOTIFICATIONS = 'notifications' as const;
export const QUEUE_CACHE_INVALIDATION = 'cache-invalidation' as const;
export const QUEUE_PROJECTIONS = 'projections' as const;
export const QUEUE_LOYALTY_REFERRALS = 'loyalty-referrals' as const;
export const QUEUE_RECONCILIATION = 'reconciliation' as const;
export const QUEUE_DATA_RETENTION = 'data-retention' as const;
export const QUEUE_DSR_FULFILMENT = 'dsr-fulfilment' as const;
export const QUEUE_CONSENT_LIFECYCLE = 'consent-lifecycle' as const;
export const QUEUE_BREACH_NOTIFICATION = 'breach-notification' as const;
