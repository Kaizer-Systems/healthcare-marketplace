import { Injectable } from '@nestjs/common';
import { CONSENT_LIFECYCLE_QUEUE } from '../../queues/consent-lifecycle/consent-lifecycle.queue.js';

@Injectable()
export class ConsentLifecycleProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${CONSENT_LIFECYCLE_QUEUE} job: ${job.id}`);
  }
}
