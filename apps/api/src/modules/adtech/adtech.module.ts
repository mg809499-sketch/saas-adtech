import { Module } from '@nestjs/common';
import { AesService } from '../../common/aes.service';
import { BillingModule } from '../billing/billing.module';
import { AdtechController } from './adtech.controller';
import { AdtechService } from './adtech.service';
import { MetaStubService } from './meta-stub.service';

@Module({ imports: [BillingModule], controllers: [AdtechController], providers: [AdtechService, MetaStubService, AesService] })
export class AdtechModule {}
