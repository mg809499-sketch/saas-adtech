import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { CheckoutDto, MockConfirmDto } from './checkout.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PlanGuard } from '../billing/plan.guard';
import { CurrentTenant, CurrentUser, TenantUser } from '../../common/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private config: ConfigService,
  ) {}

  @Post('checkout')
  checkout(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.userId, tenantId, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Query('take') takeRaw?: string) {
    return this.orders.mine(user.userId, tenantId, Number(takeRaw) || 50);
  }

  // Consola del comercio: todas las órdenes del tenant (requiere membresía).
  @UseGuards(PlanGuard)
  @Get()
  all(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Query('take') takeRaw?: string, @Query('cursor') cursor?: string) {
    if (user.role === 'CUSTOMER') throw new ForbiddenException('solo el comercio');
    return this.orders.listAll(tenantId, Number(takeRaw) || 100, cursor);
  }

  @Get(':id')
  byId(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.orders.byId(user.userId, tenantId, user.role, id);
  }

  // Widget mock de Bold: SOLO con MOCK_PAYMENTS=true (demo local). En prod este
  // endpoint no existe: la confirmación llega por webhook firmado.
  @Post('mock-confirm')
  mockConfirm(@CurrentUser() user: TenantUser, @CurrentTenant() tenantId: string, @Body() dto: MockConfirmDto) {
    if (this.config.get('MOCK_PAYMENTS') !== 'true') {
      throw new ForbiddenException('mock de pagos deshabilitado');
    }
    return this.orders.mockConfirm(user.userId, tenantId, user.role, dto.orderId, dto.approve !== false);
  }
}
