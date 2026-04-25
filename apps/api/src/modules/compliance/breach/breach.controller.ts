import { Controller } from '@nestjs/common';
import { BreachService } from './breach.service.js';

@Controller('compliance/breach')
export class BreachController {
  constructor(private readonly service: BreachService) {}
}
