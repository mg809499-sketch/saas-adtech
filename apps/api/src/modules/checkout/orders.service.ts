import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { PaymentMethod, Prisma } from '@prisma/client';
import { AesService } from '../../common/aes.service';
import { PrismaService } from '../../common/prisma.service';
import { PrismaSystemService } from '../../common/prisma-system.service';
import { RedisService } from '../../common/redis.service';
import { CheckoutDto } from './checkout.dto';
import { BoldMockService } from './bold-mock.service';

const RESERVE_TTL_MS = 15 * 60 * 1000;
const SHIPPING_FLAT = 12000;
const FREE_SHIPPING_OVER = 150000;

type Tx = Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private aes: AesService,
    private bold: BoldMockService,
    private redis: RedisService,
    private config: ConfigService,
    private system?: PrismaSystemService,
  ) {}

  private last4(cardNumber?: string) {
    const d = (cardNumber || '').replace(/\D/g, '');
    return d ? d.slice(-4) : null;
  }

  private safeShipping(shippingEnc: string): unknown {
    try {
      return JSON.parse(this.aes.decrypt(shippingEnc));
    } catch {
      this.log.warn('shippingEnc corrupto: se retorna shipping=null (no 500)');
      return null;
    }
  }

  // Crea orden PENDING + reserva atómica de stock (updateMany con gte evita oversell).
  async checkout(userId: string, tenantId: string, dto: CheckoutDto) {
    const out = await this.prisma.withTenant(tenantId, async (tx) => {
      const ids = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { tenantId, id: { in: ids }, status: 'PUBLISHED' },
        include: { variants: true },
      });
      if (products.length !== ids.length) throw new BadRequestException('producto no disponible');
      const byId = new Map(products.map((p) => [p.id, p]));
      const variantOf = new Map<string, { id: string; color: string | null; size: string | null; priceDelta: number; stock: number }>();
      for (const p of products) for (const v of p.variants) variantOf.set(v.id, v);

      let subtotal = 0;
      for (const item of dto.items) {
        const p = byId.get(item.productId)!;
        if (item.variantId) {
          const v = variantOf.get(item.variantId);
          if (!v || !products.some((x) => x.id === item.productId && x.variants.some((w) => w.id === item.variantId))) {
            throw new BadRequestException(`variante no disponible: ${p.name}`);
          }
          if (v.stock < item.qty) throw new ConflictException(`stock insuficiente: ${p.name} (${v.color || ''} ${v.size || ''})`.trim() + ` (${v.stock})`);
          // Se cobra price + delta. compareAtPrice es solo tachado visual.
          subtotal += (p.price + v.priceDelta) * item.qty;
        } else {
          if (p.stock < item.qty) throw new ConflictException(`stock insuficiente: ${p.name} (${p.stock})`);
          subtotal += p.price * item.qty;
        }
      }
      const shippingCost = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
      const total = subtotal + shippingCost;
      const idempotencyKey = dto.idempotencyKey || randomUUID();

      // Idempotencia con alcance tenant (evita colisión cross-tenant del @unique global).
      const existing = await tx.order.findFirst({ where: { idempotencyKey, tenantId } });
      if (existing) return { orderId: existing.id, mock: null as unknown };

      const mock = this.bold.createPayment(total, dto.paymentMethod as never, dto.payment);
      const reservedUntil = new Date(Date.now() + RESERVE_TTL_MS);

      for (const item of dto.items) {
        const p = byId.get(item.productId)!;
        if (item.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId, product: { id: p.id, tenantId }, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (updated.count !== 1) throw new ConflictException(`stock insuficiente: ${p.name}`);
        } else {
          const updated = await tx.product.updateMany({
            where: { id: p.id, tenantId, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (updated.count !== 1) throw new ConflictException(`stock insuficiente: ${p.name}`);
        }
      }
      const created = await tx.order.create({
        data: {
          tenantId,
          userId,
          status: 'PENDING_PAYMENT',
          subtotal,
          shippingCost,
          total,
          paymentMethod: dto.paymentMethod as PaymentMethod,
          idempotencyKey,
          boldTxId: mock.boldTxId,
          reservedUntil,
          shippingEnc: this.aes.encrypt(JSON.stringify(dto.shipping)),
          items: {
            create: dto.items.map((i) => {
              const p = byId.get(i.productId)!;
              const v = i.variantId ? variantOf.get(i.variantId) : undefined;
              const label = v ? [v.color, v.size].filter(Boolean).join(' / ') : null;
              return {
                productId: p.id,
                name: p.name,
                unitPrice: p.price + (v?.priceDelta ?? 0),
                qty: i.qty,
                variantId: v?.id,
                variantLabel: label,
              };
            }),
          },
          attempts: {
            create: { method: dto.paymentMethod as PaymentMethod, status: 'PENDING', boldTxId: mock.boldTxId, last4: this.last4(dto.payment?.cardNumber) },
          },
        },
      });
      return { orderId: created.id, mock };
    });

    await this.redis.reserve(out.orderId);
    if (!out.mock) return this.toPublic(out.orderId, tenantId);
    return { ...(await this.toPublic(out.orderId, tenantId)), mock: out.mock };
  }

  private async toPublicTx(tx: Tx, orderId: string, tenantId: string) {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, attempts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('orden no encontrada');
    const { shippingEnc, ...rest } = order;
    return { ...rest, shipping: this.safeShipping(shippingEnc) };
  }

  private async toPublic(orderId: string, tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) => this.toPublicTx(tx, orderId, tenantId));
  }

  async mine(userId: string, tenantId: string, take = 50) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const orders = await tx.order.findMany({
        where: { userId, tenantId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(take, 1), 100),
      });
      return orders.map((o) => {
        const { shippingEnc, ...rest } = o;
        return { ...rest, shipping: this.safeShipping(shippingEnc) };
      });
    });
  }

  async listAll(tenantId: string, take = 100, cursor?: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const orders = await tx.order.findMany({
        where: { tenantId },
        include: { items: true, user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(take, 1), 100),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      return orders.map((o) => {
        const { shippingEnc, ...rest } = o;
        return { ...rest, shipping: this.safeShipping(shippingEnc) };
      });
    });
  }

  async byId(userId: string, tenantId: string, role: string, orderId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, tenantId }, include: { items: true, attempts: true } });
      if (!order) throw new NotFoundException('orden no encontrada');
      if (order.userId !== userId && role === 'CUSTOMER') throw new ForbiddenException('no es tu orden');
      const { shippingEnc, ...rest } = order;
      return { ...rest, shipping: this.safeShipping(shippingEnc) };
    });
  }

  // Transición compartida por webhook real y mock: idempotente y con tenant aislado.
  async applyBoldResult(tenantId: string, orderId: string, approved: boolean, eventId?: string) {
    const out = await this.prisma.withTenant(tenantId, async (tx) => {
      if (eventId) {
        const seen = await tx.webhookEvent.findUnique({ where: { eventId } });
        if (seen) return { orderId, done: true };
      }
      const order = await tx.order.findFirst({ where: { id: orderId, tenantId }, include: { items: true } });
      if (!order) throw new NotFoundException('orden no encontrada');
      if (order.status !== 'PENDING_PAYMENT') {
        if (eventId) await tx.webhookEvent.upsert({ where: { eventId }, update: {}, create: { eventId, type: 'duplicate', orderId } });
        return { orderId, done: true };
      }

      if (approved) {
        await tx.order.update({ where: { id: orderId }, data: { status: 'PAID', reservedUntil: null } });
        await tx.paymentAttempt.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'APPROVED' } });
      } else {
        await tx.order.update({ where: { id: orderId }, data: { status: 'FAILED', reservedUntil: null } });
        await tx.paymentAttempt.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'REJECTED' } });
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
          } else {
            await tx.product.updateMany({ where: { id: item.productId, tenantId }, data: { stock: { increment: item.qty } } });
          }
        }
      }
      if (eventId) await tx.webhookEvent.create({ data: { eventId, type: approved ? 'payment.approved' : 'payment.rejected', orderId } });
      return { orderId, done: true };
    });
    await this.redis.release(orderId);
    return this.toPublic(out.orderId, tenantId);
  }

  // Callback simulado: el botón Aprobar/Rechazar del widget mock equivale al webhook de Bold.
  async mockConfirm(userId: string, tenantId: string, role: string, orderId: string, approve: boolean) {
    const order = await this.prisma.withTenant(tenantId, (tx) =>
      tx.order.findFirst({ where: { id: orderId, tenantId } }),
    );
    if (!order) throw new NotFoundException('orden no encontrada');
    if (order.userId !== userId && role === 'CUSTOMER') throw new ForbiddenException('no es tu orden');
    return this.applyBoldResult(tenantId, orderId, approve);
  }

  verifySignature(rawBody: Buffer, signature?: string): boolean {
    if (!signature || !rawBody) return false;
    const expected = createHmac('sha256', this.config.getOrThrow<string>('BOLD_WEBHOOK_SECRET'))
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // Cron cross-tenant: escanea reservas vencidas de TODOS los tenants → cliente system.
  @Cron('*/1 * * * *')
  async expireReservations() {
    const db = this.system ?? this.prisma;
    const expired = await db.order.findMany({
      where: { status: 'PENDING_PAYMENT', reservedUntil: { lt: new Date() } },
      include: { items: true },
      orderBy: { reservedUntil: 'asc' },
      take: 200,
    });
    for (const order of expired) {
      const client = this.system ?? this.prisma;
      await client.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', reservedUntil: null } });
        for (const item of order.items) {
          if ((item as { variantId?: string | null }).variantId) {
            await tx.productVariant.updateMany({
              where: { id: (item as { variantId?: string }).variantId! },
              data: { stock: { increment: item.qty } },
            });
          } else {
            await tx.product.updateMany({
              where: { id: item.productId, tenantId: order.tenantId },
              data: { stock: { increment: item.qty } },
            });
          }
        }
      });
      await this.redis.release(order.id);
      this.log.log(`orden ${order.id} expirada → CANCELLED, stock liberado`);
    }
  }
}
