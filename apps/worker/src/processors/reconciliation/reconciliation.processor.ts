import { Injectable } from '@nestjs/common';
import { RECONCILIATION_QUEUE } from '../../queues/reconciliation/reconciliation.queue.js';

@Injectable()
export class ReconciliationProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${RECONCILIATION_QUEUE} job: ${job.id}`);
  }
}
