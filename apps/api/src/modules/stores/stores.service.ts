import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';
import { PrismaSystemService } from '../../common/prisma-system.service';
import { RedisService } from '../../common/redis.service';
import { BillingService } from '../billing/billing.service';
import { PlanService } from '../billing/plan.service';
import { PagesService } from '../pages/pages.service';

export class CreateStoreDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, { message: 'slug: solo minúsculas, números y guiones (3-30)' })
  slug!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(minimal|catalog|landing)$/, { message: 'template: minimal|catalog|landing' })
  templateSlug?: string;
}

const RESERVED = new Set(['www', 'api', 'app', 'admin', 'billing', 'tienda', 'store', 'growup', 'demo', 'soporte']);
const STORE_DOMAIN = process.env.STORE_DOMAIN || 'growupstore.app';
const PROVISION_FLIGHT_MS = 5 * 60 * 1000;
// Throttle check-slug: 20/min por IP (single-instance; ver domains.service).
const SLUG_CHECK_LIMIT = 20;
const SLUG_CHECK_WINDOW_MS = 60 * 1000;

// Las tiendas nuevas nacen VACÍAS: sin productos demo. El asistente guía el primer producto.

@Injectable()
export class StoresService {
  // system = lecturas cross-tenant explícitas (vitrina pública, cupo, mine).
  // redis = holds de slug (soft, con TTL; la red final es el @@unique).
  private slugChecks = new Map<string, number[]>();
  constructor(
    private prisma: PrismaService,
    private system: PrismaSystemService,
    private redis: RedisService,
    private billing: BillingService,
    private plans: PlanService,
    private pages: PagesService,
  ) {}

  async checkSlug(slug: string, ip = 'unknown') {
    const now = Date.now();
    const hits = (this.slugChecks.get(ip) || []).filter((t) => now - t < SLUG_CHECK_WINDOW_MS);
    if (hits.length >= SLUG_CHECK_LIMIT) {
      throw new HttpException('slug_check_throttled: intenta en un minuto', HttpStatus.TOO_MANY_REQUESTS);
    }
    hits.push(now);
    this.slugChecks.set(ip, hits);
    if (RESERVED.has(slug)) return { available: false, reason: 'reservado' };
    const taken = await this.prisma.tenant.findUnique({ where: { storeSlug: slug } });
    return { available: !taken };
  }

  // Vitrina pública: tiendas con suscripción vigente (sin secretos ni PII).
  // Cross-tenant por diseño → cliente system.
  async publicList() {
    const subs = await this.system.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
      },
      include: {
        plan: { select: { name: true } },
        tenant: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true, _count: { select: { products: true } } } },
      },
      take: 50,
    });
    return subs
      .filter((s) => s.tenant.storeSlug)
      .map((s) => ({ id: s.tenant.id, name: s.tenant.storeName, slug: s.tenant.storeSlug, logoUrl: s.tenant.logoUrl, plan: s.plan.name, products: s.tenant._count.products }));
  }

  // Dominio propio → tenant vivo (para resolveHost del edge).
  async byDomain(domain: string) {
    const d = domain.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
    const t = await this.prisma.tenant.findFirst({
      where: { customDomain: d, domainStatus: 'VERIFIED' },
      select: { id: true, storeName: true, storeSlug: true },
    });
    if (!t?.storeSlug) throw new NotFoundException('dominio no vinculado');
    const sub = await this.prisma.withTenant(t.id, (tx) => tx.subscription.findUnique({ where: { tenantId: t.id } }));
    const live = !!sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING') && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
    if (!live) throw new NotFoundException('tienda no disponible');
    return { id: t.id, storeName: t.storeName, storeSlug: t.storeSlug };
  }

  async bySlug(slug: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { storeSlug: slug },
      select: { id: true, name: true, storeName: true, storeSlug: true, logoUrl: true, customDomain: true, domainStatus: true, theme: true, seo: true },
    });
    if (!t) throw new NotFoundException('tienda no encontrada');
    const sub = await this.prisma.withTenant(t.id, (tx) => tx.subscription.findUnique({ where: { tenantId: t.id } }));
    const live = !!sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING') && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
    if (!live) throw new NotFoundException('tienda no disponible');
    return t;
  }

  // Consola: tiendas propias del dueño (Tenant sin RLS, pero el include de
  // subscription cruza tenants → system con WHERE por ownerId).
  mine(ownerId: string) {
    return this.system.tenant.findMany({
      where: { ownerId },
      include: { subscription: { include: { plan: true } }, _count: { select: { products: true, orders: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Alta idempotente y compensada:
  // - Idempotency-Key → reintento seguro (ACTIVE retorna lo existente).
  // - Hold de slug en Redis cierra la race check-slug→create (red final: @@unique).
  // - Si el seed falla, se compensa borrando el tenant (cascada) y se marca FAILED.
  async create(ownerId: string, dto: CreateStoreDto, idempotencyKey?: string) {
    const slug = dto.slug.toLowerCase();
    if (RESERVED.has(slug)) throw new BadRequestException('slug reservado');
    const template = dto.templateSlug || 'minimal';

    if (idempotencyKey) {
      const prev = await this.prisma.storeProvision.findUnique({ where: { idempotencyKey } });
      if (prev?.status === 'ACTIVE' && prev.tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: prev.tenantId } });
        if (tenant) {
          const subscription = await this.system.subscription.findUnique({
            where: { tenantId: tenant.id },
            include: { plan: true },
          });
          return { tenant, subscription, storeUrl: this.storeUrl(tenant.storeSlug || slug), deduped: true };
        }
      }
      if (prev?.status === 'PENDING' && Date.now() - prev.createdAt.getTime() < PROVISION_FLIGHT_MS) {
        throw new ConflictException('provisioning_in_flight: el alta anterior aún se procesa');
      }
      if (prev) await this.prisma.storeProvision.delete({ where: { idempotencyKey } });
    }

    const holdKey = `slug:hold:${slug}`;
    const holder = await this.redis.getValue(holdKey);
    if (holder && holder !== ownerId) throw new ConflictException('slug_reserved: en proceso por otro usuario');
    await this.redis.acquire(holdKey, ownerId, 600);

    const taken = await this.prisma.tenant.findUnique({ where: { storeSlug: slug } });
    if (taken) {
      await this.redis.releaseKey(holdKey, ownerId);
      throw new ConflictException('ese slug ya está en uso');
    }

    const owned = await this.plans.storesOwnedBy(ownerId);
    if (owned > 0) {
      // Requiere un plan ACTIVO con cupo en alguna tienda propia (cross-tenant → system).
      const subs = await this.system.subscription.findMany({
        where: { tenant: { ownerId }, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
        include: { plan: true },
      });
      const quota = subs.some((s) => s.plan.maxStores > owned);
      if (!quota) {
        await this.redis.releaseKey(holdKey, ownerId);
        throw new ForbiddenException({ message: 'stores_limit: tu plan no permite más tiendas', code: 'stores_limit' });
      }
    }

    if (idempotencyKey) {
      await this.prisma.storeProvision.create({
        data: { idempotencyKey, ownerId, template, status: 'PENDING' },
      });
    }
    const fail = async (tenantId: string | null, err: unknown) => {
      if (tenantId) {
        await this.prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
      }
      if (idempotencyKey) {
        await this.prisma.storeProvision
          .update({ where: { idempotencyKey }, data: { status: 'FAILED', error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500) } })
          .catch(() => {});
      }
      await this.redis.releaseKey(holdKey, ownerId);
      throw err;
    };

    let tenantId: string | null = null;
    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          name: dto.name,
          slug: `store-${slug}`,
          storeName: dto.name,
          storeSlug: slug,
          logoUrl: dto.logoUrl,
          ownerId,
          template,
        },
      });
      tenantId = tenant.id;
      // El dueño puede vivir en otro tenant (demo) → system para la promoción de rol.
      await this.system.user.updateMany({ where: { id: ownerId }, data: { role: 'MERCHANT' } });
      const subscription = await this.billing.ensureTrialing(tenant.id);
      await this.pages.seedHome(tenant.id, dto.name, template);
      if (idempotencyKey) {
        await this.prisma.storeProvision.update({
          where: { idempotencyKey },
          data: { status: 'ACTIVE', tenantId: tenant.id },
        });
      }
      await this.redis.releaseKey(holdKey, ownerId);
      return { tenant, subscription, storeUrl: this.storeUrl(slug), deduped: false };
    } catch (err) {
      return fail(tenantId, err);
    }
  }

  private storeUrl(slug: string) {
    return `https://${slug}.${STORE_DOMAIN}`;
  }

  // Export por tenant (F10): corre con withTenant → solo ve lo propio por
  // construcción. Sin passwordHash ni secretos: apto para backup/migración.
  async exportData(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const { boldPubEnc, boldSecEnc, metaTokenEnc, ...safeTenant } = tenant;
      const [users, products, rawOrders, campaigns, pages, subscriptions, agreements, checks] = await Promise.all([
        tx.user.findMany({ where: { tenantId }, select: { id: true, email: true, name: true, role: true, createdAt: true } }),
        tx.product.findMany({ where: { tenantId } }),
        tx.order.findMany({ where: { tenantId }, include: { items: true, attempts: true } }),
        tx.adCampaign.findMany({ where: { tenantId } }),
        tx.storePage.findMany({ where: { tenantId }, include: { blocks: true } }),
        tx.subscription.findMany({ where: { tenantId }, include: { events: true } }),
        tx.affiliateAgreement.findMany({ where: { OR: [{ sourceTenantId: tenantId }, { targetTenantId: tenantId }] } }),
        tx.domainCheck.findMany({ where: { tenantId } }),
      ]);
      // Forma importable: referencias por claves naturales (email/slug), no por IDs.
      const emailById = new Map(users.map((u) => [u.id, u.email]));
      const slugByProduct = new Map(products.map((p) => [p.id, p.slug]));
      const orders = rawOrders.map((o) => ({
        ...o,
        userEmail: emailById.get(o.userId) || '',
        items: o.items.map((i) => ({ ...i, productSlug: slugByProduct.get(i.productId) || '' })),
      }));
      return {
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        tenantId,
        tenant: safeTenant,
        users, products, orders, campaigns, pages, subscriptions, agreements, checks,
      };
    });
  }

  // Import (ADMIN, system): clona un export en un tenant NUEVO con ids remapeados.
  // Mismo DB hoy; el procedimiento es el que un día movería un enterprise a su BD.
  async importData(data: {
    tenant: { name: string; slug: string; storeName?: string | null; storeSlug?: string | null; logoUrl?: string | null; template?: string | null };
    users: { email: string; name?: string | null; role: string }[];
    products: { slug: string; sku: string; name: string; description?: string | null; price: number; compareAtPrice?: number | null; stock: number; category: string; status: string; imageUrl?: string | null }[];
    orders: { status: string; subtotal: number; shippingCost: number; total: number; currency: string; paymentMethod: string; idempotencyKey: string; shippingEnc: string; userEmail: string; items: { productSlug: string; name: string; unitPrice: number; qty: number }[] }[];
    pages: { slug: string; title: string; status: string; blocks: { type: string; props: unknown; order: number; visible: boolean }[] }[];
  }) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const slug = `${data.tenant.slug}-imp-${suffix}`.slice(0, 60);
    const storeSlug = data.tenant.storeSlug ? `${data.tenant.storeSlug}-imp-${suffix}`.slice(0, 30) : null;
    const tenant = await this.system.tenant.create({
      data: { name: data.tenant.name, slug, storeName: data.tenant.storeName, storeSlug, logoUrl: data.tenant.logoUrl, template: data.tenant.template },
    });
    const counts = await this.prisma.withTenant(tenant.id, async (tx) => {
      const userByEmail = new Map<string, string>();
      for (const u of data.users) {
        const created = await tx.user.create({
          data: { tenantId: tenant.id, email: u.email.toLowerCase(), name: u.name, passwordHash: 'locked-import-reset-required', role: u.role as never },
        });
        userByEmail.set(u.email.toLowerCase(), created.id);
      }
      const productBySlug = new Map<string, string>();
      for (const p of data.products) {
        const created = await tx.product.create({
          data: { tenantId: tenant.id, slug: p.slug, sku: p.sku, name: p.name, description: p.description, price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock, category: p.category, status: p.status as never, imageUrl: p.imageUrl },
        });
        productBySlug.set(p.slug, created.id);
      }
      let orders = 0;
      for (const o of data.orders) {
        const userId = userByEmail.get(o.userEmail.toLowerCase());
        if (!userId) continue;
        await tx.order.create({
          data: {
            tenantId: tenant.id, userId, status: o.status as never, subtotal: o.subtotal, shippingCost: o.shippingCost,
            total: o.total, currency: o.currency, paymentMethod: o.paymentMethod as never,
            idempotencyKey: `${o.idempotencyKey}-imp-${suffix}`, shippingEnc: o.shippingEnc,
            items: {
              create: o.items
                .filter((i) => productBySlug.has(i.productSlug))
                .map((i) => ({ productId: productBySlug.get(i.productSlug)!, name: i.name, unitPrice: i.unitPrice, qty: i.qty })),
            },
          },
        });
        orders++;
      }
      let pages = 0;
      for (const pg of data.pages) {
        await tx.storePage.create({
          data: {
            tenantId: tenant.id, slug: pg.slug, title: pg.title, status: pg.status as never,
            blocks: { create: pg.blocks.map((b) => ({ type: b.type, props: b.props as never, order: b.order, visible: b.visible })) },
          },
        });
        pages++;
      }
      return { users: userByEmail.size, products: productBySlug.size, orders, pages };
    });
    return { tenant, counts };
  }

  // Checklist de puesta en marcha: agrega estado que ya existe (dominio,
  // catálogo, pasarela, plan) en un solo llamado para el onboarding.
  async onboarding(tenantId: string) {
    const [tenant, products, sub] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.withTenant(tenantId, (tx) => tx.product.count({ where: { tenantId } })),
      this.plans.statusOf(tenantId),
    ]);
    const gateway = !!(tenant.boldPubEnc && tenant.boldSecEnc);
    const items = [
      { key: 'store', done: true, href: `/s/${tenant.storeSlug}`, label: 'Tienda creada' },
      { key: 'domain', done: tenant.domainStatus === 'VERIFIED', href: '/consola/dominio-marca', label: 'Dominio propio verificado' },
      { key: 'catalog', done: products > 0, href: '/consola/catalogo-inventario', label: 'Primer producto publicado' },
      { key: 'gateway', done: gateway, href: '/consola/pasarelas-pagos', label: 'Pasarela Bold conectada' },
      { key: 'plan', done: sub.active, href: '/planes', label: 'Plan activo' },
    ];
    return { storeUrl: tenant.storeSlug ? this.storeUrl(tenant.storeSlug) : null, template: tenant.template || 'minimal', items, done: items.filter((i) => i.done).length };
  }
}
