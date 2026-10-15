import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { BillingModule } from '../billing/billing.module';
import { PagesModule } from '../pages/pages.module';

@Module({ imports: [BillingModule, PagesModule], controllers: [StoresController], providers: [StoresService], exports: [StoresService] })
export class StoresModule {}
