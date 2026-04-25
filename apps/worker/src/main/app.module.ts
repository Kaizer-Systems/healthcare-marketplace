import { Module } from '@nestjs/common';
import { OrderSyncQueueModule } from '../queues/order-sync/order-sync.queue.module.js';
import { InventorySyncQueueModule } from '../queues/inventory-sync/inventory-sync.queue.module.js';
import { NotificationsQueueModule } from '../queues/notifications/notifications.queue.module.js';
import { CacheInvalidationQueueModule } from '../queues/cache-invalidation/cache-invalidation.queue.module.js';
import { ProjectionsQueueModule } from '../queues/projections/projections.queue.module.js';
import { LoyaltyReferralsQueueModule } from '../queues/loyalty-referrals/loyalty-referrals.queue.module.js';
import { ReconciliationQueueModule } from '../queues/reconciliation/reconciliation.queue.module.js';
import { DataRetentionQueueModule } from '../queues/data-retention/data-retention.queue.module.js';
import { DsrFulfilmentQueueModule } from '../queues/dsr-fulfilment/dsr-fulfilment.queue.module.js';
import { ConsentLifecycleQueueModule } from '../queues/consent-lifecycle/consent-lifecycle.queue.module.js';
import { BreachNotificationQueueModule } from '../queues/breach-notification/breach-notification.queue.module.js';

@Module({
  imports: [
    OrderSyncQueueModule,
    InventorySyncQueueModule,
    NotificationsQueueModule,
    CacheInvalidationQueueModule,
    ProjectionsQueueModule,
    LoyaltyReferralsQueueModule,
    ReconciliationQueueModule,
    DataRetentionQueueModule,
    DsrFulfilmentQueueModule,
    ConsentLifecycleQueueModule,
    BreachNotificationQueueModule,
  ],
})
export class AppModule {}
