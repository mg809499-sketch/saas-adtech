import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PlanService } from './plan.service';
import { PlanGuard } from './plan.guard';
import { BoldMockService } from '../checkout/bold-mock.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, PlanService, PlanGuard, BoldMockService],
  exports: [PlanService, PlanGuard, BillingService],
})
export class BillingModule {}
