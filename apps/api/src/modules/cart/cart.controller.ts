import { Controller } from '@nestjs/common';
import { CartService } from './cart.service.js';

@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}
}
