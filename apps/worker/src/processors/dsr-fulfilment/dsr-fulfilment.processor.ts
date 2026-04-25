import { Injectable } from '@nestjs/common';
import { DSR_FULFILMENT_QUEUE } from '../../queues/dsr-fulfilment/dsr-fulfilment.queue.js';

@Injectable()
export class DsrFulfilmentProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${DSR_FULFILMENT_QUEUE} job: ${job.id}`);
  }
}
