import { Injectable } from '@nestjs/common';
import { DATA_RETENTION_QUEUE } from '../../queues/data-retention/data-retention.queue.js';

@Injectable()
export class DataRetentionProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${DATA_RETENTION_QUEUE} job: ${job.id}`);
  }
}
