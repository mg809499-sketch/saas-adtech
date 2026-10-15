import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { AffiliatesService } from './affiliates.service';
import { RequestAgreementDto } from './affiliates.dto';

@Controller()
export class AffiliatesController {
  constructor(private affiliates: AffiliatesService) {}

  // Público: escaparate de la Red Aliada (sin secretos, con throttle del gateway).
  @Get('directory/featured-products')
  featured() {
    return this.affiliates.featuredProducts();
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Get('affiliates/mine')
  mine(@CurrentTenant() tenantId: string) {
    return this.affiliates.mine(tenantId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Post('affiliates/request')
  request(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: RequestAgreementDto) {
    return this.affiliates.request(tenantId, user.role, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Post('affiliates/:id/accept')
  accept(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.affiliates.accept(tenantId, user.role, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Post('affiliates/:id/revoke')
  revoke(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.affiliates.revoke(tenantId, user.role, id);
  }
}
