import { Controller } from '@nestjs/common';
import { ReferralsService } from './referrals.service.js';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}
}
