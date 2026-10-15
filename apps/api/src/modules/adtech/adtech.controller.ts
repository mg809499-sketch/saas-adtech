import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { AdtechService } from './adtech.service';
import { ConnectMetaDto, CreateCampaignDto } from './adtech.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('meta-ads')
export class AdtechController {
  constructor(private adtech: AdtechService) {}

  @Get('status')
  status(@CurrentTenant() tenantId: string) {
    return this.adtech.status(tenantId);
  }

  @UseGuards(PlanGuard)
  @Post('connect')
  connect(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: ConnectMetaDto) {
    return this.adtech.connect(tenantId, user.role, dto.accessToken, {
      businessManagerId: dto.businessManagerId,
      adAccountId: dto.adAccountId,
      pixelId: dto.pixelId,
    });
  }

  @UseGuards(PlanGuard)
  @Post('campaigns')
  create(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.adtech.create(tenantId, user.role, dto);
  }

  @UseGuards(PlanGuard)
  @Get('campaigns')
  list(@CurrentTenant() tenantId: string) {
    return this.adtech.list(tenantId);
  }

  @UseGuards(PlanGuard)
  @Patch('campaigns/:id/pause')
  pause(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.adtech.setStatus(tenantId, user.role, id, 'PAUSED');
  }

  @UseGuards(PlanGuard)
  @Patch('campaigns/:id/resume')
  resume(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.adtech.setStatus(tenantId, user.role, id, 'ACTIVE');
  }
}
