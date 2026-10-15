import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { AttachDomainDto, DomainsService, UpdateSeoDto, UpdateStoreDto, UpdateThemeDto } from './domains.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('stores')
export class DomainsController {
  constructor(private domains: DomainsService) {}

  @Get(':id/domain')
  domainState(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string) {
    return this.domains.domainState(this.scope(id, tenantId));
  }

  @Get(':id/domain-search')
  search(@Param('id') id: string, @CurrentTenant() tenantId: string, @Query('q') q = '') {
    this.scope(id, tenantId);
    return this.domains.search(q);
  }

  @UseGuards(PlanGuard)
  @Post(':id/domain/purchase')
  purchase(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: AttachDomainDto) {
    return this.domains.purchaseIntent(this.scope(id, tenantId), user.userId, user.role, dto.domain);
  }

  @UseGuards(PlanGuard)
  @Post(':id/domain')
  attach(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: AttachDomainDto) {
    return this.domains.attach(this.scope(id, tenantId), user.userId, user.role, dto.domain);
  }

  @UseGuards(PlanGuard)
  @Post(':id/domain/verify')
  verify(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string) {
    return this.domains.verify(this.scope(id, tenantId), user.userId, user.role);
  }

  @Delete(':id/domain')
  unlink(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string) {
    return this.domains.unlink(this.scope(id, tenantId), user.userId, user.role);
  }

  @UseGuards(PlanGuard)
  @Patch(':id/theme')
  theme(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: UpdateThemeDto) {
    return this.domains.updateTheme(this.scope(id, tenantId), user.userId, user.role, dto);
  }

  @UseGuards(PlanGuard)
  @Patch(':id/seo')
  seo(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: UpdateSeoDto) {
    return this.domains.updateSeo(this.scope(id, tenantId), user.userId, user.role, dto);
  }

  @UseGuards(PlanGuard)
  @Patch(':id')
  store(@Param('id') id: string, @CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: UpdateStoreDto) {
    return this.domains.updateStore(this.scope(id, tenantId), user.userId, user.role, dto);
  }

  // El :id de la URL debe coincidir con el tenant efectivo del guard (anti IDOR).
  private scope(id: string, tenantId: string): string {
    if (id !== tenantId) throw new ForbiddenException('tenant mismatch');
    return tenantId;
  }
}
