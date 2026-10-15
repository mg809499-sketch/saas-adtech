// Integración contra Postgres local/temporal. Autocontenido: crea sus propios
// tenants/productos y los limpia; no depende del seed.
// Cubre: aislamiento app-level (byId/checkout) + RLS a nivel BD.
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AesService } from '../../common/aes.service';
import { RedisService } from '../../common/redis.service';
import { OrdersService } from './orders.service';
import { BoldMockService } from './bold-mock.service';

describe('Aislamiento multi-tenant', () => {
  const prisma = new PrismaService();
  const cfg = {
    getOrThrow: (k: string) =>
      ({ AES_SERVICE_KEY: 'dev-aes-32-bytes-key-1234567890ab', BOLD_WEBHOOK_SECRET: 'whsec_demo_local', JWT_SECRET: 'dev-jwt-secret-1234567890' })[k],
    get: () => undefined,
  } as never;
  const orders = new OrdersService(prisma, new AesService(cfg), new BoldMockService(), new RedisService(cfg), cfg);

  const suffix = randomUUID().slice(0, 8);
  let tenantA = '';
  let tenantB = '';
  let userA = '';
  let productA = '';
  let orderA = '';

  beforeAll(async () => {
    await prisma.onModuleInit();
    const a = await prisma.tenant.create({ data: { name: `spec-a-${suffix}`, slug: `spec-a-${suffix}` } });
    const b = await prisma.tenant.create({ data: { name: `spec-b-${suffix}`, slug: `spec-b-${suffix}` } });
    tenantA = a.id;
    tenantB = b.id;
    // User/Product tienen RLS: se crean con el GUC del propio tenant.
    const ua = await prisma.withTenant(tenantA, (tx) =>
      tx.user.create({
        data: { tenantId: tenantA, email: `a-${suffix}@spec.co`, passwordHash: 'x', role: 'CUSTOMER' },
      }),
    );
    await prisma.withTenant(tenantB, (tx) =>
      tx.user.create({
        data: { tenantId: tenantB, email: `b-${suffix}@spec.co`, passwordHash: 'x', role: 'MERCHANT' },
      }),
    );
    userA = ua.id;
    const p = await prisma.withTenant(tenantA, (tx) =>
      tx.product.create({
        data: { tenantId: tenantA, name: `Spec ${suffix}`, slug: `spec-${suffix}`, sku: `SPEC-${suffix}`, price: 50000, stock: 5, status: 'PUBLISHED' },
      }),
    );
    productA = p.id;
  });

  afterAll(async () => {
    // Orden explícito: la orden primero (OrderItem→Product es Restrict y el
    // cascade tenant→product puede chocar con items aún vivos).
    await prisma.withTenant(tenantA, (tx) => tx.order.deleteMany({ where: { tenantId: tenantA } }).then(() => undefined));
    await prisma.withTenant(tenantB, (tx) => tx.order.deleteMany({ where: { tenantId: tenantB } }).then(() => undefined));
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.onModuleDestroy();
  });

  it('checkout crea orden en el tenant propio', async () => {
    const out = (await orders.checkout(userA, tenantA, {
      items: [{ productId: productA, qty: 1 }],
      shipping: { name: 'Spec', phone: '3000000000', address: 'Calle 1', city: 'Bogotá' },
      paymentMethod: 'PSE' as never,
    })) as { id: string };
    orderA = out.id;
    expect(orderA).toBeDefined();
  });

  it('tenant B no lee la orden del tenant A (app-level)', async () => {
    await expect(orders.byId('cualquiera', tenantB, 'MERCHANT', orderA)).rejects.toThrow();
  });

  it('checkout con producto de otro tenant falla', async () => {
    const userB = await prisma.withTenant(tenantB, (tx) => tx.user.findFirstOrThrow({ where: { tenantId: tenantB } }));
    await expect(
      orders.checkout(userB.id, tenantB, {
        items: [{ productId: productA, qty: 1 }],
        shipping: { name: 'X', phone: '1', address: 'a', city: 'c' },
        paymentMethod: 'PSE' as never,
      }),
    ).rejects.toThrow();
  });

  it('RLS: con app.tenant_id=B la orden de A es invisible en SQL crudo', async () => {
    const rows = (await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantB);
      return tx.$queryRawUnsafe(`SELECT id FROM "Order" WHERE id = $1`, orderA) as Promise<unknown[]>;
    })) as unknown[];
    expect(rows).toHaveLength(0);
  });
});
