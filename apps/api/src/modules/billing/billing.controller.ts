import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CurrentTenant } from '../../common/current-user.decorator';
import { BillingService, CheckoutPlanDto } from './billing.service';
import { PlanService } from './plan.service';

@Controller('billing')
export class BillingController {
  constructor(
    private billing: BillingService,
    private planService: PlanService,
  ) {}

  @Get('plans')
  plans() {
    return this.billing.plans();
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('status')
  status(@CurrentTenant() tenantId: string) {
    return this.planService.statusOf(tenantId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('checkout')
  checkout(@CurrentTenant() tenantId: string, @Body() dto: CheckoutPlanDto) {
    return this.billing.checkoutPlan(tenantId, dto);
  }
}
