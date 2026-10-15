import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaSystemService } from '../../common/prisma-system.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { CurrentUser, TenantUser } from '../../common/current-user.decorator';
import { StoresService } from '../stores/stores.service';
import {
  CreatePlanDto,
  CreateSubscriptionDto,
  RenewSubscriptionDto,
  ResolveCampaignDto,
  SuspendStoreDto,
  UpdateAgreementDto,
  UpdatePlanDto,
  UpdateSettingDto,
  UpdateSubscriptionDto,
  UpdateUserRoleDto,
} from './platform.dto';

// Ajustes globales editables (SiteSetting). Tipos validados en PUT.
const SETTING_DEFS: Record<string, { type: 'string' | 'number' | 'boolean'; def: unknown; label: string }> = {
  business_name: { type: 'string', def: 'GrowUp Store', label: 'Nombre del negocio' },
  support_email: { type: 'string', def: 'soporte@growupstore.co', label: 'Correo de soporte' },
  logo_url: { type: 'string', def: '', label: 'Logo (URL)' },
  trial_days: { type: 'number', def: 14, label: 'Días de trial para tiendas nuevas' },
  default_commission_pct: { type: 'number', def: 15, label: 'Comisión aliada por defecto %' },
  maintenance_mode: { type: 'boolean', def: false, label: 'Modo mantenimiento (vitrinas)' },
};

const SUB_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const;

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  // Agregados cross-tenant (solo ADMIN por RolesGuard) → cliente system.
  // Import de tenants vía StoresService (roundtrip del export por tenant).
  constructor(
    private prisma: PrismaSystemService,
    private tenantStores: StoresService,
  ) {}

  @Get('metrics')
  async metrics() {
    const now = new Date();
    const [stores, activeSubs, trials, pastDue, orders, paidAgg, plans] = await Promise.all([
      this.prisma.tenant.count({ where: { storeSlug: { not: null } } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE', OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] } }),
      this.prisma.subscription.count({ where: { status: 'TRIALING', currentPeriodEnd: { gt: now } } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      this.prisma.order.count({}),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: 'PAID' } }),
      this.prisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } } }),
    ]);
    const mrr = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] },
      include: { plan: { select: { priceMonthlyUsd: true } } },
    });
    return {
      stores, activeSubs, trials, pastDue,
      orders, paidVolume: paidAgg._sum.total ?? 0,
      mrrUsd: mrr.reduce((a, s) => a + s.plan.priceMonthlyUsd, 0),
      plans: plans.map((p) => ({ slug: p.slug, name: p.name, subs: p._count.subscriptions })),
    };
  }

  @Get('stores')
  stores() {
    return this.prisma.tenant.findMany({
      where: { storeSlug: { not: null } },
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { products: true, orders: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('subscriptions')
  subscriptions() {
    return this.prisma.subscription.findMany({
      include: { plan: true, tenant: { select: { storeName: true, storeSlug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  @Get('events')
  events(@Query('take') take = '30') {
    return this.prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Number(take) || 30, 100) });
  }

  // Red Aliada: bandeja SuperAdmin. El cliente solo envía solicitudes
  // (POST /affiliates/request); la plataforma las aprueba o rechaza aquí y
  // el estado se refleja en el contenedor dinámico del cliente.
  @Get('affiliates')
  async affiliates(@Query('status') status?: string) {
    const rows = await this.prisma.affiliateAgreement.findMany({
      where: status && ['PENDING', 'ACTIVE', 'REVOKED'].includes(status) ? { status: status as never } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const ids = [...new Set(rows.flatMap((a) => [a.sourceTenantId, a.targetTenantId]))];
    const tenants = ids.length
      ? await this.prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, storeSlug: true, storeName: true } })
      : [];
    const byId = new Map(tenants.map((t) => [t.id, t]));
    return rows.map((a) => ({
      ...a,
      sourceSlug: byId.get(a.sourceTenantId)?.storeSlug ?? a.sourceTenantId,
      targetSlug: byId.get(a.targetTenantId)?.storeSlug ?? a.targetTenantId,
      sourceName: byId.get(a.sourceTenantId)?.storeName ?? null,
      targetName: byId.get(a.targetTenantId)?.storeName ?? null,
    }));
  }

  @Post('affiliates/:id/resolve')
  async resolveAffiliate(
    @CurrentUser() actor: TenantUser,
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT' },
  ) {
    if (body?.decision !== 'APPROVE' && body?.decision !== 'REJECT') {
      throw new BadRequestException('decision debe ser APPROVE o REJECT');
    }
    const found = await this.prisma.affiliateAgreement.findUnique({ where: { id } });
    if (!found) throw new BadRequestException('solicitud no encontrada');
    const out = await this.prisma.affiliateAgreement.update({
      where: { id },
      data: { status: body.decision === 'APPROVE' ? 'ACTIVE' : 'REVOKED' },
    });
    await this.audit(actor.userId, `affiliate.${body.decision === 'APPROVE' ? 'approve' : 'reject'}`, id, { from: found.status });
    return out;
  }

  // Red: editar comisión, eliminar vínculo.
  @Patch('affiliates/:id')
  async updateAgreement(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: UpdateAgreementDto) {
    const found = await this.prisma.affiliateAgreement.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('alianza no encontrada');
    const out = await this.prisma.affiliateAgreement.update({ where: { id }, data: { commissionPct: dto.commissionPct } });
    await this.audit(actor.userId, 'affiliate.update', id, { commissionPct: dto.commissionPct });
    return out;
  }

  @Delete('affiliates/:id')
  async deleteAgreement(@CurrentUser() actor: TenantUser, @Param('id') id: string) {
    const found = await this.prisma.affiliateAgreement.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('alianza no encontrada');
    await this.prisma.affiliateAgreement.delete({ where: { id } });
    await this.audit(actor.userId, 'affiliate.delete', id, { status: found.status });
    return { ok: true };
  }

  // --- Suscripciones: crear manual, editar, renovar, eliminar, historial ---
  @Post('subscriptions')
  async createSubscription(@CurrentUser() actor: TenantUser, @Body() dto: CreateSubscriptionDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ storeSlug: dto.tenantSlug.toLowerCase() }, { slug: dto.tenantSlug.toLowerCase() }] },
    });
    if (!tenant) throw new NotFoundException('tienda no encontrada');
    const plan = await this.prisma.plan.findUnique({ where: { slug: dto.planSlug.toUpperCase() } });
    if (!plan) throw new NotFoundException('plan no existe');
    const status = (dto.status || 'ACTIVE') as (typeof SUB_STATUSES)[number];
    const months = dto.months ?? 1;
    const end = new Date(Date.now() + months * 30 * 24 * 3600 * 1000);
    const sub = await this.prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: { planSlug: plan.slug, status, currentPeriodEnd: end },
      create: { tenantId: tenant.id, planSlug: plan.slug, status, currentPeriodEnd: end },
    });
    await this.event(sub.id, 'admin.grant', { plan: plan.slug, status, months, by: actor.userId });
    await this.audit(actor.userId, 'subscription.grant', sub.id, { tenant: tenant.storeSlug, plan: plan.slug, status });
    return sub;
  }

  @Patch('subscriptions/:id')
  async updateSubscription(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    const found = await this.prisma.subscription.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('suscripción no encontrada');
    const data: { planSlug?: string; status?: never; currentPeriodEnd?: Date | null } = {};
    if (dto.planSlug !== undefined) {
      const plan = await this.prisma.plan.findUnique({ where: { slug: dto.planSlug.toUpperCase() } });
      if (!plan) throw new NotFoundException('plan no existe');
      data.planSlug = plan.slug;
    }
    if (dto.status !== undefined) data.status = dto.status as never;
    if (dto.currentPeriodEnd !== undefined) {
      data.currentPeriodEnd = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null;
    }
    const out = await this.prisma.subscription.update({ where: { id }, data });
    await this.event(id, 'admin.update', { ...dto, by: actor.userId });
    await this.audit(actor.userId, 'subscription.update', id, dto);
    return out;
  }

  @Post('subscriptions/:id/renew')
  async renewSubscription(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: RenewSubscriptionDto) {
    const found = await this.prisma.subscription.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('suscripción no encontrada');
    const months = dto.months ?? 1;
    const base = found.currentPeriodEnd && found.currentPeriodEnd > new Date() ? found.currentPeriodEnd.getTime() : Date.now();
    const end = new Date(base + months * 30 * 24 * 3600 * 1000);
    const out = await this.prisma.subscription.update({ where: { id }, data: { status: 'ACTIVE', currentPeriodEnd: end } });
    await this.event(id, 'admin.renew', { months, end, by: actor.userId });
    await this.audit(actor.userId, 'subscription.renew', id, { months });
    return out;
  }

  @Delete('subscriptions/:id')
  async deleteSubscription(@CurrentUser() actor: TenantUser, @Param('id') id: string) {
    const found = await this.prisma.subscription.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('suscripción no encontrada');
    await this.prisma.subscription.delete({ where: { id } });
    await this.audit(actor.userId, 'subscription.delete', id, { tenantId: found.tenantId });
    return { ok: true };
  }

  @Get('subscriptions/:id/events')
  subscriptionEvents(@Param('id') id: string, @Query('take') take = '50') {
    return this.prisma.subscriptionEvent.findMany({
      where: { subscriptionId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 200),
    });
  }

  // --- Planes: crear, editar, eliminar (conectados a las tarjetas de /planes) ---
  @Post('plans')
  async createPlan(@CurrentUser() actor: TenantUser, @Body() dto: CreatePlanDto) {
    const exists = await this.prisma.plan.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('ese slug de plan ya existe');
    const out = await this.prisma.plan.create({
      data: { slug: dto.slug, name: dto.name, priceMonthlyUsd: dto.priceMonthlyUsd, priceMonthlyCop: dto.priceMonthlyCop, imageUrl: dto.imageUrl || null, maxStores: dto.maxStores, maxProducts: dto.maxProducts, features: (dto.features ?? {}) as never },
    });
    await this.audit(actor.userId, 'plan.create', dto.slug, { name: dto.name });
    return out;
  }

  @Patch('plans/:slug')
  async updatePlan(@CurrentUser() actor: TenantUser, @Param('slug') slug: string, @Body() dto: UpdatePlanDto) {
    const found = await this.prisma.plan.findUnique({ where: { slug: slug.toUpperCase() } });
    if (!found) throw new NotFoundException('plan no existe');
    const out = await this.prisma.plan.update({
      where: { slug: found.slug },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceMonthlyUsd !== undefined ? { priceMonthlyUsd: dto.priceMonthlyUsd } : {}),
        ...(dto.priceMonthlyCop !== undefined ? { priceMonthlyCop: dto.priceMonthlyCop } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl || null } : {}),
        ...(dto.maxStores !== undefined ? { maxStores: dto.maxStores } : {}),
        ...(dto.maxProducts !== undefined ? { maxProducts: dto.maxProducts } : {}),
        ...(dto.features !== undefined ? { features: dto.features as never } : {}),
      },
    });
    await this.audit(actor.userId, 'plan.update', found.slug, dto);
    return out;
  }

  @Delete('plans/:slug')
  async deletePlan(@CurrentUser() actor: TenantUser, @Param('slug') slug: string) {
    const found = await this.prisma.plan.findUnique({ where: { slug: slug.toUpperCase() }, include: { _count: { select: { subscriptions: true } } } });
    if (!found) throw new NotFoundException('plan no existe');
    if (found._count.subscriptions > 0) {
      throw new ConflictException(`el plan tiene ${found._count.subscriptions} suscripciones: migra primero`);
    }
    await this.prisma.plan.delete({ where: { slug: found.slug } });
    await this.audit(actor.userId, 'plan.delete', found.slug, {});
    return { ok: true };
  }

  // --- Tiendas: detalle, usuarios, suspender/reactivar, eliminar ---
  @Get('stores/:id/users')
  storeUsers(@Param('id') id: string) {
    return this.prisma.user.findMany({
      where: { tenantId: id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch('users/:id')
  async updateUserRole(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const found = await this.prisma.user.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('usuario no encontrado');
    const out = await this.prisma.user.update({ where: { id }, data: { role: dto.role as never } });
    await this.audit(actor.userId, 'user.role', id, { from: found.role, to: dto.role });
    return { id: out.id, email: out.email, role: out.role };
  }

  @Delete('users/:id')
  async deleteUser(@CurrentUser() actor: TenantUser, @Param('id') id: string) {
    if (id === actor.userId) throw new BadRequestException('no puedes eliminarte a ti mismo');
    const found = await this.prisma.user.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('usuario no encontrado');
    const owned = await this.prisma.tenant.count({ where: { ownerId: id } });
    if (owned > 0) throw new ConflictException('es dueño de tiendas: reasigna o elimina primero');
    await this.prisma.user.delete({ where: { id } });
    await this.audit(actor.userId, 'user.delete', id, { email: found.email });
    return { ok: true };
  }

  @Post('stores/:id/suspend')
  async suspendStore(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: SuspendStoreDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, include: { subscription: true } });
    if (!tenant) throw new NotFoundException('tienda no encontrada');
    const admins = await this.prisma.user.count({ where: { tenantId: id, role: 'ADMIN' } });
    if (admins > 0 && dto.action === 'SUSPEND') throw new BadRequestException('la tienda aloja cuentas de plataforma');
    if (!tenant.subscription) throw new BadRequestException('la tienda no tiene suscripción');
    const toActive = dto.action === 'REACTIVATE';
    const end = toActive
      ? (tenant.subscription.currentPeriodEnd && tenant.subscription.currentPeriodEnd > new Date()
        ? tenant.subscription.currentPeriodEnd
        : new Date(Date.now() + 30 * 24 * 3600 * 1000))
      : tenant.subscription.currentPeriodEnd;
    const out = await this.prisma.subscription.update({
      where: { tenantId: id },
      data: { status: toActive ? 'ACTIVE' : 'CANCELED', currentPeriodEnd: end },
    });
    await this.event(out.id, toActive ? 'admin.reactivate' : 'admin.suspend', { reason: dto.reason, by: actor.userId });
    await this.audit(actor.userId, toActive ? 'store.reactivate' : 'store.suspend', id, { reason: dto.reason });
    return out;
  }

  @Delete('stores/:id')
  async deleteStore(@CurrentUser() actor: TenantUser, @Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('tienda no encontrada');
    const admins = await this.prisma.user.count({ where: { tenantId: id, role: 'ADMIN' } });
    if (admins > 0) throw new BadRequestException('la tienda aloja cuentas de plataforma: no se puede eliminar');
    await this.prisma.affiliateAgreement.deleteMany({ where: { OR: [{ sourceTenantId: id }, { targetTenantId: id }] } });
    await this.prisma.domainCheck.deleteMany({ where: { tenantId: id } });
    await this.prisma.storeProvision.updateMany({ where: { tenantId: id }, data: { tenantId: null } });
    await this.prisma.tenant.delete({ where: { id } });
    await this.audit(actor.userId, 'store.delete', id, { slug: tenant.storeSlug });
    return { ok: true };
  }

  // --- Meta Ads plataforma: bandeja de revisión y resolución ---
  @Get('meta-ads/campaigns')
  metaCampaigns(@Query('status') status?: string, @Query('take') take = '100') {
    return this.prisma.adCampaign.findMany({
      where: status ? { status: status as never } : {},
      include: { tenant: { select: { storeSlug: true, storeName: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 100, 200),
    });
  }

  @Post('meta-ads/:id/resolve')
  async resolveCampaign(@CurrentUser() actor: TenantUser, @Param('id') id: string, @Body() dto: ResolveCampaignDto) {
    const found = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('campaña no encontrada');
    if (found.status !== 'PENDING_REVIEW') throw new BadRequestException('la campaña ya fue revisada');
    const out = await this.prisma.adCampaign.update({
      where: { id },
      data: { status: dto.decision === 'APPROVE' ? 'ACTIVE' : 'PAUSED', reviewNote: dto.note || null },
    });
    await this.audit(actor.userId, `meta-ads.${dto.decision === 'APPROVE' ? 'approve' : 'reject'}`, id, { note: dto.note });
    return out;
  }

  // --- Pasarelas plataforma: tablero enmascarado + revocación ---
  @Get('gateways')
  async gateways() {
    const tenants = await this.prisma.tenant.findMany({
      where: { storeSlug: { not: null } },
      select: {
        id: true, storeSlug: true, storeName: true,
        boldPubEnc: true, boldSecEnc: true, metaTokenEnc: true, metaAdAccount: true, metaPixel: true,
        subscription: { select: { status: true, plan: { select: { name: true } } } },
      },
      orderBy: { storeSlug: 'asc' },
    });
    return tenants.map((t) => ({
      tenantId: t.id, storeSlug: t.storeSlug, storeName: t.storeName,
      boldConfigured: !!(t.boldPubEnc && t.boldSecEnc),
      metaConfigured: !!(t.metaTokenEnc && t.metaAdAccount && t.metaPixel),
      metaAdAccount: t.metaAdAccount, metaPixel: t.metaPixel,
      subscription: t.subscription?.status ?? 'NONE', plan: t.subscription?.plan.name ?? null,
    }));
  }

  @Delete('gateways/:tenantId/keys')
  async revokeKeys(@CurrentUser() actor: TenantUser, @Param('tenantId') tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('tienda no encontrada');
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { boldPubEnc: null, boldSecEnc: null, metaTokenEnc: null } });
    await this.audit(actor.userId, 'gateway.revoke', tenantId, { slug: tenant.storeSlug });
    return { ok: true };
  }

  // --- Dominios plataforma: en uso + conexiones de API (solo presencia) ---
  @Get('domains')
  async domains() {
    return this.prisma.tenant.findMany({
      where: { customDomain: { not: null } },
      select: {
        id: true, storeSlug: true, storeName: true, customDomain: true,
        domainStatus: true, domainVerifiedAt: true,
        subscription: { select: { status: true, plan: { select: { name: true } } } },
      },
      orderBy: { domainVerifiedAt: 'desc' },
    });
  }

  @Delete('domains/:tenantId')
  async unlinkDomain(@CurrentUser() actor: TenantUser, @Param('tenantId') tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.customDomain) throw new NotFoundException('sin dominio propio');
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: null, domainStatus: 'UNVERIFIED', domainToken: null, domainVerifiedAt: null },
    });
    await this.audit(actor.userId, 'domain.unlink', tenantId, { domain: tenant.customDomain });
    return { ok: true };
  }

  @Get('integrations')
  integrations() {
    return {
      storeDomain: process.env.STORE_DOMAIN || 'growupstore.app',
      edgeAskConfigured: !!process.env.INTERNAL_EDGE_SECRET,
      namecheapConfigured: !!(process.env.NAMECHEAP_API_USER && process.env.NAMECHEAP_API_KEY && process.env.NAMECHEAP_CLIENT_IP),
      mockPayments: process.env.MOCK_PAYMENTS === 'true',
    };
  }

  // --- Ajustes del negocio GrowUp ---
  @Get('settings')
  async settings() {
    const rows = await this.prisma.siteSetting.findMany();
    const byKey = new Map(rows.map((r) => [r.key, (r.value as { v?: unknown })?.v]));
    return Object.entries(SETTING_DEFS).map(([key, def]) => ({
      key, label: def.label, type: def.type, value: byKey.has(key) ? byKey.get(key) : def.def,
    }));
  }

  @Patch('settings')
  async updateSetting(@CurrentUser() actor: TenantUser, @Body() dto: UpdateSettingDto) {
    const def = SETTING_DEFS[dto.key];
    if (!def) throw new BadRequestException('ajuste desconocido');
    const v = dto.value;
    if (def.type === 'string' && typeof v !== 'string') throw new BadRequestException('debe ser texto');
    if (def.type === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) throw new BadRequestException('debe ser número');
    if (def.type === 'boolean' && typeof v !== 'boolean') throw new BadRequestException('debe ser true/false');
    if (dto.key === 'trial_days' && (Number(v) < 1 || Number(v) > 60)) throw new BadRequestException('trial 1-60 días');
    if (dto.key === 'default_commission_pct' && (Number(v) < 1 || Number(v) > 35)) throw new BadRequestException('comisión 1-35%');
    const out = await this.prisma.siteSetting.upsert({
      where: { key: dto.key },
      update: { value: { v } as never },
      create: { key: dto.key, value: { v } as never },
    });
    await this.audit(actor.userId, 'setting.update', dto.key, { value: v });
    return { key: out.key, value: v };
  }

  // --- Auditoría plataforma ---
  @Get('audit')
  auditList(@Query('action') action?: string, @Query('take') take = '100', @Query('skip') skip = '0') {
    return this.prisma.auditLog.findMany({
      where: action ? { action: { contains: action } } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 100, 200),
      skip: Math.max(Number(skip) || 0, 0),
    });
  }

  // Clona un export (ver GET /stores/:id/export) en un tenant NUEVO.
  @Post('tenants/import')
  importTenant(@Body() body: Parameters<StoresService['importData']>[0]) {
    return this.tenantStores.importData(body);
  }

  private audit(actorId: string, action: string, target?: string, meta?: unknown) {
    return this.prisma.auditLog.create({ data: { actorId, action, target, meta: (meta ?? {}) as never } }).catch(() => null);
  }

  private event(subscriptionId: string, type: string, meta?: unknown) {
    return this.prisma.subscriptionEvent.create({ data: { subscriptionId, type, meta: (meta ?? {}) as never } }).catch(() => null);
  }
}
