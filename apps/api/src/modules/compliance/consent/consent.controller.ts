import { Controller } from '@nestjs/common';
import { ConsentService } from './consent.service.js';

@Controller('compliance/consent')
export class ConsentController {
  constructor(private readonly service: ConsentService) {}
}
