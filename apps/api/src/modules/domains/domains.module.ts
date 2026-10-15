import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DomainsController } from './domains.controller';
import { InternalController } from './internal.controller';
import { DomainsService } from './domains.service';

@Module({ imports: [BillingModule], controllers: [DomainsController, InternalController], providers: [DomainsService], exports: [DomainsService] })
export class DomainsModule {}
