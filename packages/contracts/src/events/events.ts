export type DomainEvent<T = unknown> = {
  type: string;
  payload: T;
  timestamp: Date;
  correlationId: string;
};

export const USER_CREATED = 'user.created' as const;
export const ORDER_PLACED = 'order.placed' as const;
export const INVENTORY_UPDATED = 'inventory.updated' as const;
