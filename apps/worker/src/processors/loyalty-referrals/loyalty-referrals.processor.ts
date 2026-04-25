import { Injectable } from '@nestjs/common';
import { LOYALTY_REFERRALS_QUEUE } from '../../queues/loyalty-referrals/loyalty-referrals.queue.js';

@Injectable()
export class LoyaltyReferralsProcessor {
  async process(job: { id?: string; data: unknown }): Promise<void> {
    console.log(`Processing ${LOYALTY_REFERRALS_QUEUE} job: ${job.id}`);
  }
}
