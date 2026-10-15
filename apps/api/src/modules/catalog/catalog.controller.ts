import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto, CreateVariantDto, UpdateProductDto, UpdateVariantDto } from './catalog.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentPlan, CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';

@Controller('products')
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get()
  async list(
    @Headers('x-tenant-id') header: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('take') takeRaw?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!header) throw new BadRequestException('tenant_required');
    const take = Math.min(Math.max(Number(takeRaw) || 50, 1), 100);
    return this.catalog.list(header, search, category, take, cursor);
  }

  @Get(':slug')
  async bySlug(@Headers('x-tenant-id') header: string, @Param('slug') slug: string) {
    if (!header) throw new BadRequestException('tenant_required');
    return this.catalog.bySlug(header, slug);
  }

  // Consola del comercio: crear y ajustar inventario (requiere membresía).
  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Post()
  create(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @CurrentPlan() plan: { maxProducts: number },
    @Body() dto: CreateProductDto,
  ) {
    return this.catalog.create(tenantId, user.role, plan.maxProducts, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalog.update(tenantId, user.role, id, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Delete(':id')
  remove(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.remove(tenantId, user.role, id);
  }

  // Variantes del producto (color/talla con stock propio).
  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Get(':id/variants')
  variants(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.catalog.variants(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Post(':id/variants')
  createVariant(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.catalog.createVariant(tenantId, user.role, id, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Patch('variants/:vid')
  updateVariant(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('vid') vid: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalog.updateVariant(tenantId, user.role, vid, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
  @Delete('variants/:vid')
  removeVariant(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('vid') vid: string,
  ) {
    return this.catalog.removeVariant(tenantId, user.role, vid);
  }
}
