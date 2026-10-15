import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PagesController } from './pages.controller';
import { StorefrontController } from './storefront.controller';
import { PagesService } from './pages.service';

@Module({ imports: [BillingModule], controllers: [PagesController, StorefrontController], providers: [PagesService], exports: [PagesService] })
export class PagesModule {}
