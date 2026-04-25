import { Controller } from '@nestjs/common';
import { SellersService } from './sellers.service.js';

@Controller('sellers')
export class SellersController {
  constructor(private readonly service: SellersService) {}
}
