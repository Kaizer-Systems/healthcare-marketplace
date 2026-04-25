import { Injectable } from '@nestjs/common';
import { ORDER_SYNC_QUEUE } from '../../queues/order-sync/order-sync.queue.js';

@Injectable()
export class OrderSyncProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${ORDER_SYNC_QUEUE} job: ${job.id}`);
  }
}
