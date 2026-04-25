import { Controller } from '@nestjs/common';
import { SellerPortalService } from './seller-portal.service.js';

@Controller('seller-portal')
export class SellerPortalController {
  constructor(private readonly service: SellerPortalService) {}
}
