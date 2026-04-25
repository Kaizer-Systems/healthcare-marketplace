import { Injectable } from '@nestjs/common';
import { CACHE_INVALIDATION_QUEUE } from '../../queues/cache-invalidation/cache-invalidation.queue.js';

@Injectable()
export class CacheInvalidationProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${CACHE_INVALIDATION_QUEUE} job: ${job.id}`);
  }
}
