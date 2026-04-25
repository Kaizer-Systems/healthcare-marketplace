import { Module } from '@nestjs/common';
import { HealthModule } from '../modules/health/health.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { UsersModule } from '../modules/users/users.module.js';
import { CustomersModule } from '../modules/customers/customers.module.js';
import { SellersModule } from '../modules/sellers/sellers.module.js';
import { CatalogModule } from '../modules/catalog/catalog.module.js';
import { CategoriesModule } from '../modules/categories/categories.module.js';
import { ProductsModule } from '../modules/products/products.module.js';
import { SearchModule } from '../modules/search/search.module.js';
import { CartModule } from '../modules/cart/cart.module.js';
import { CheckoutModule } from '../modules/checkout/checkout.module.js';
import { OrdersModule } from '../modules/orders/orders.module.js';
import { DocumentsModule } from '../modules/documents/documents.module.js';
import { LoyaltyModule } from '../modules/loyalty/loyalty.module.js';
import { ReferralsModule } from '../modules/referrals/referrals.module.js';
import { AdminModule } from '../modules/admin/admin.module.js';
import { SellerPortalModule } from '../modules/seller-portal/seller-portal.module.js';
import { UploadsModule } from '../modules/uploads/uploads.module.js';
import { ComplianceModule } from '../modules/compliance/compliance.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    SellersModule,
    CatalogModule,
    CategoriesModule,
    ProductsModule,
    SearchModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    DocumentsModule,
    LoyaltyModule,
    ReferralsModule,
    AdminModule,
    SellerPortalModule,
    UploadsModule,
    ComplianceModule,
  ],
})
export class AppModule {}
