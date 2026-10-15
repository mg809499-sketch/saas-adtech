import { Module } from '@nestjs/common';
import { AesService } from '../../common/aes.service';
import { BillingModule } from '../billing/billing.module';
import { OrdersController } from './orders.controller';
import { BoldWebhookController } from './bold-webhook.controller';
import { OrdersService } from './orders.service';
import { BoldMockService } from './bold-mock.service';

@Module({
  imports: [BillingModule],
  controllers: [OrdersController, BoldWebhookController],
  // RedisService es global (CommonModule): una sola conexión para locks y reservas.
  providers: [OrdersService, BoldMockService, AesService],
})
export class CheckoutModule {}
