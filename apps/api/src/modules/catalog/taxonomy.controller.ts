import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateSizeGuideDto, UpdateCategoryDto } from './catalog.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';

// Categorías (árbol 2 niveles) y guías de tallas de la tienda propia.
@UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private catalog: CatalogService) {}

  @Get()
  tree(@CurrentTenant() tenantId: string) {
    return this.catalog.categoriesTree(tenantId);
  }

  @Post()
  create(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(tenantId, user.role, dto);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: TenantUser,
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalog.renameCategory(tenantId, user.role, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.catalog.removeCategory(tenantId, user.role, id);
  }
}

@UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
@Controller('size-guides')
export class SizeGuidesController {
  constructor(private catalog: CatalogService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.catalog.sizeGuides(tenantId);
  }

  @Post()
  create(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: CreateSizeGuideDto) {
    return this.catalog.createSizeGuide(tenantId, user.role, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.catalog.removeSizeGuide(tenantId, user.role, id);
  }
}
