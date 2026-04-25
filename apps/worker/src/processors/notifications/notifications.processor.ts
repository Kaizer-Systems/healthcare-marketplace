import { Injectable } from '@nestjs/common';
import { NOTIFICATIONS_QUEUE } from '../../queues/notifications/notifications.queue.js';

@Injectable()
export class NotificationsProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${NOTIFICATIONS_QUEUE} job: ${job.id}`);
  }
}
