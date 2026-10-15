import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../common/prisma.service';
import { PrismaSystemService } from '../../common/prisma-system.service';
import { RedisService } from '../../common/redis.service';
import { StoresService } from './stores.service';
import { BillingService } from '../billing/billing.service';
import { PlanService } from '../billing/plan.service';
import { PagesService } from '../pages/pages.service';
import { BoldMockService } from '../checkout/bold-mock.service';

// Alta idempotente de tiendas: un key = un tenant, slug con hold, compensación.
describe('Store provisioning', () => {
  // jest no carga .env: hidrata las faltantes desde apps/api/.env.
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* CI inyecta el env */
  }
  const prisma = new PrismaService();
  const cfg = { getOrThrow: (k: string) => ({})[k], get: () => undefined } as never;
  const system = new PrismaSystemService({ get: () => process.env.SYSTEM_DATABASE_URL } as never);
  const redis = new RedisService(cfg);
  const billing = new BillingService(prisma, new BoldMockService());
  const plans = new PlanService(prisma);
  const pages = new PagesService(prisma);
  const stores = new StoresService(prisma, system, redis, billing, plans, pages);

  const suffix = randomUUID().slice(0, 8);
  const createdTenants: string[] = [];
  let scratch = '';
  let ownerA = '';
  let ownerB = '';
  let ownerC = '';

  beforeAll(async () => {
    await prisma.onModuleInit();
    await system.onModuleInit();
    const t0 = await prisma.tenant.create({ data: { name: `spec-prov-${suffix}`, slug: `spec-prov-${suffix}` } });
    scratch = t0.id;
    const mk = (email: string) =>
      prisma.withTenant(scratch, (tx) =>
        tx.user.create({ data: { tenantId: scratch, email, passwordHash: 'x', role: 'CUSTOMER' } }),
      );
    ownerA = (await mk(`prova-${suffix}@spec.co`)).id;
    ownerB = (await mk(`provb-${suffix}@spec.co`)).id;
    ownerC = (await mk(`provc-${suffix}@spec.co`)).id;
  });

  afterAll(async () => {
    for (const id of createdTenants) {
      await prisma.tenant.delete({ where: { id } }).catch(() => {});
    }
    await prisma.storeProvision.deleteMany({ where: { ownerId: { in: [ownerA, ownerB, ownerC] } } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: scratch } }).catch(() => {});
    await prisma.onModuleDestroy();
    await system.onModuleDestroy();
  });

  it('crea tienda con trial, home y storeUrl', async () => {
    const key = randomUUID();
    const slug = `spect-${suffix}`;
    const r = (await stores.create(ownerA, { name: `Spect ${suffix}`, slug }, key)) as {
      tenant: { id: string; storeSlug: string };
      storeUrl: string;
      deduped: boolean;
    };
    createdTenants.push(r.tenant.id);
    expect(r.tenant.storeSlug).toBe(slug);
    expect(r.storeUrl).toContain(slug);
    expect(r.deduped).toBe(false);
    const prov = await prisma.storeProvision.findUniqueOrThrow({ where: { idempotencyKey: key } });
    expect(prov.status).toBe('ACTIVE');
    // Cupo para los siguientes creates del mismo owner (requiere plan ACTIVO).
    await system.subscription.upsert({
      where: { tenantId: r.tenant.id },
      update: { planSlug: 'SCALE_PRO', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      create: { tenantId: r.tenant.id, planSlug: 'SCALE_PRO', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });
  });

  it('reintento con el mismo key retorna lo existente (deduped)', async () => {
    const key = randomUUID();
    const slug = `specd-${suffix}`;
    const first = (await stores.create(ownerA, { name: `Specd ${suffix}`, slug }, key)) as { tenant: { id: string } };
    createdTenants.push(first.tenant.id);
    const second = (await stores.create(ownerA, { name: `Otro nombre`, slug: `otro-${suffix}` }, key)) as {
      tenant: { id: string };
      deduped: boolean;
    };
    expect(second.deduped).toBe(true);
    expect(second.tenant.id).toBe(first.tenant.id);
  });

  it('race por el mismo slug: uno gana, el otro Conflict', async () => {
    const slug = `specr-${suffix}`;
    const results = await Promise.allSettled([
      stores.create(ownerA, { name: `RA ${suffix}`, slug }, randomUUID()),
      stores.create(ownerB, { name: `RB ${suffix}`, slug }, randomUUID()),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ tenant: { id: string } }>[];
    const bad = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    createdTenants.push(ok[0].value.tenant.id);
  });

  it('plantilla catalog deja 5 bloques en home', async () => {
    // Owner fresco (0 tiendas → sin chequeo de cupo).
    const r = (await stores.create(ownerC, { name: `Specc ${suffix}`, slug: `specc-${suffix}`, templateSlug: 'catalog' }, randomUUID())) as {
      tenant: { id: string };
    };
    createdTenants.push(r.tenant.id);
    const blocks = await prisma.withTenant(r.tenant.id, (tx) =>
      tx.storeBlock.findMany({ where: { page: { tenantId: r.tenant.id } } }),
    );
    expect(blocks.length).toBe(5);
  });
});
