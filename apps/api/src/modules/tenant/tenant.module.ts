import { Module } from '@nestjs/common';
import { AesService } from '../../common/aes.service';
import { BillingModule } from '../billing/billing.module';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';

@Module({ imports: [BillingModule], controllers: [GatewayController], providers: [GatewayService, AesService], exports: [GatewayService] })
export class TenantModule {}
