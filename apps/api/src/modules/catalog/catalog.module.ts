import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CatalogController } from './catalog.controller';
import { CategoriesController, SizeGuidesController } from './taxonomy.controller';
import { CatalogService } from './catalog.service';

@Module({ imports: [BillingModule], controllers: [CatalogController, CategoriesController, SizeGuidesController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
