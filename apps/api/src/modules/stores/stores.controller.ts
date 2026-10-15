import { Body, Controller, ForbiddenException, Get, Headers, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { StoresService, CreateStoreDto } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private stores: StoresService) {}

  // Públicos (vitrina)
  @Get('public')
  publicList() {
    return this.stores.publicList();
  }

  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.stores.bySlug(slug.toLowerCase());
  }

  // Resolución pública para middleware edge / custom domains.
  // Solo dominios VERIFICADOS (el resto sigue por slug).
  @Get('by-domain/:domain')
  byDomain(@Param('domain') domain: string) {
    return this.stores.byDomain(domain.toLowerCase());
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: TenantUser) {
    return this.stores.mine(user.userId);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string, @Ip() ip: string) {
    return this.stores.checkSlug((slug || '').toLowerCase(), ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: TenantUser,
    @Body() dto: CreateStoreDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.stores.create(user.userId, dto, idempotencyKey?.trim() || undefined);
  }

  // Checklist de onboarding de una tienda propia (anti-IDOR vía scope).
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':id/onboarding')
  onboarding(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    if (id !== tenantId) throw new ForbiddenException('tenant mismatch');
    return this.stores.onboarding(tenantId);
  }

  // Export del tenant propio para backup/migración (sin secretos).
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':id/export')
  exportData(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    if (id !== tenantId) throw new ForbiddenException('tenant mismatch');
    return this.stores.exportData(tenantId);
  }
}
