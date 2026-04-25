import { Injectable } from '@nestjs/common';
import { INVENTORY_SYNC_QUEUE } from '../../queues/inventory-sync/inventory-sync.queue.js';

@Injectable()
export class InventorySyncProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${INVENTORY_SYNC_QUEUE} job: ${job.id}`);
  }
}
