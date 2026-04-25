import { Controller } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service.js';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}
}
