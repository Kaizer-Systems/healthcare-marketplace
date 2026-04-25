import { Injectable } from '@nestjs/common';
import { PROJECTIONS_QUEUE } from '../../queues/projections/projections.queue.js';

@Injectable()
export class ProjectionsProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${PROJECTIONS_QUEUE} job: ${job.id}`);
  }
}
