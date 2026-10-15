import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { GatewayService, UpdateGatewayDto } from './gateway.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenant/gateway')
export class GatewayController {
  constructor(private gateway: GatewayService) {}

  @Get()
  get(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string) {
    return this.gateway.getMasked(tenantId, user.role);
  }

  @UseGuards(PlanGuard)
  @Put()
  update(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: UpdateGatewayDto) {
    return this.gateway.update(tenantId, user.role, dto);
  }
}
