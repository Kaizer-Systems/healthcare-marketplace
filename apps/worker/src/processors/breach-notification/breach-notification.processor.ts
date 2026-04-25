import { Injectable } from '@nestjs/common';
import { BREACH_NOTIFICATION_QUEUE } from '../../queues/breach-notification/breach-notification.queue.js';

@Injectable()
export class BreachNotificationProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${BREACH_NOTIFICATION_QUEUE} job: ${job.id}`);
  }
}
