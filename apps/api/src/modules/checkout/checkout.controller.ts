import { Controller } from '@nestjs/common';
import { CheckoutService } from './checkout.service.js';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}
}
