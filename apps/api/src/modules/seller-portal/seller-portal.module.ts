import { Module } from '@nestjs/common';
import { SellerPortalController } from './seller-portal.controller.js';
import { SellerPortalService } from './seller-portal.service.js';

@Module({ controllers: [SellerPortalController], providers: [SellerPortalService] })
export class SellerPortalModule {}
