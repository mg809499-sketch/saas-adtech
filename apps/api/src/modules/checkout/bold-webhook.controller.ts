import { Body, Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaSystemService } from '../../common/prisma-system.service';

interface BoldEvent {
  event_id: string;
  type: 'payment.approved' | 'payment.rejected';
  order_id: string;
}

// POST /api/v1/webhooks/bold — verifica HMAC-SHA256 del rawBody antes de mutar nada.
// Lookup por PK cross-tenant → cliente system (el tenant se deriva de la orden
// y applyBoldResult re-aisla con withTenant).
@Controller('webhooks/bold')
export class BoldWebhookController {
  constructor(
    private orders: OrdersService,
    private prisma: PrismaSystemService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Req() req: { rawBody?: Buffer }, @Headers('x-bold-signature') signature: string, @Body() event: BoldEvent) {
    if (!this.orders.verifySignature(req.rawBody!, signature)) {
      throw new UnauthorizedException('firma bold inválida');
    }
    const order = await this.prisma.order.findUnique({ where: { id: event.order_id } });
    if (!order) return { ok: true, ignored: true };
    const result = await this.orders.applyBoldResult(order.tenantId, event.order_id, event.type === 'payment.approved', event.event_id);
    return { ok: true, status: result.status };
  }
}
