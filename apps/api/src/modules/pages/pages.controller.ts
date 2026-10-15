import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { CreateBlockDto, CreatePageDto, PagesService, ReorderDto, UpdateBlockDto } from './pages.service';

@UseGuards(JwtAuthGuard, TenantGuard, PlanGuard)
@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.pages.list(tenantId);
  }

  @Post()
  createPage(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Body() dto: CreatePageDto) {
    return this.pages.createPage(tenantId, user.userId, user.role, dto);
  }

  @Get(':pageId/blocks')
  blocks(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('pageId') pageId: string) {
    return this.pages.blocks(tenantId, user.userId, user.role, pageId);
  }

  @Post(':pageId/blocks')
  addBlock(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('pageId') pageId: string, @Body() dto: CreateBlockDto) {
    return this.pages.addBlock(tenantId, user.userId, user.role, pageId, dto);
  }

  @Patch('blocks/:blockId')
  updateBlock(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('blockId') blockId: string, @Body() dto: UpdateBlockDto) {
    return this.pages.updateBlock(tenantId, user.userId, user.role, blockId, dto);
  }

  @Delete('blocks/:blockId')
  removeBlock(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('blockId') blockId: string) {
    return this.pages.removeBlock(tenantId, user.userId, user.role, blockId);
  }

  @Post(':pageId/reorder')
  reorder(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('pageId') pageId: string, @Body() dto: ReorderDto) {
    return this.pages.reorder(tenantId, user.userId, user.role, pageId, dto.ids);
  }

  @Patch(':pageId/publish')
  publish(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('pageId') pageId: string) {
    return this.pages.setStatus(tenantId, user.userId, user.role, pageId, 'PUBLISHED');
  }

  @Post(':pageId/apply-template')
  applyTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: TenantUser,
    @Param('pageId') pageId: string,
    @Body() dto: { template?: string },
  ) {
    return this.pages.applyTemplate(tenantId, user.userId, user.role, pageId, dto.template || 'minimal');
  }

  @Patch(':pageId/unpublish')
  unpublish(@CurrentTenant() tenantId: string, @CurrentUser() user: TenantUser, @Param('pageId') pageId: string) {
    return this.pages.setStatus(tenantId, user.userId, user.role, pageId, 'DRAFT');
  }
}
