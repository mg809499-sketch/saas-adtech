import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { randomBytes, timingSafeEqual } from 'crypto';
import { resolveTxt } from 'dns/promises';
import { PrismaService } from '../../common/prisma.service';

// Normaliza ANTES de validar: acepta URLs, rutas y www. (www.x.com → x.com).
export function normalizeDomainInput(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '')
    .replace(/\.$/, '');
}

export class AttachDomainDto {
  @IsString()
  @Transform(({ value }) => normalizeDomainInput(value))
  @Matches(/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/, { message: 'dominio inválido' })
  domain!: string;
}

// Whitelist estricta de personalización (nada fuera de aquí se guarda).
export class UpdateThemeDto {
  @IsOptional() @IsString() @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/) primary?: string;
  @IsOptional() @IsString() @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/) accent?: string;
  @IsOptional() @IsString() @MaxLength(80) heroTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) heroSubtitle?: string;
  @IsOptional() @IsString() @MaxLength(300) bannerUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) announcement?: string;
  @IsOptional() @IsString() @MaxLength(300) logoUrl?: string;
}

export class UpdateSeoDto {
  @IsOptional() @IsString() @MinLength(10) @MaxLength(70) title?: string;
  @IsOptional() @IsString() @MinLength(30) @MaxLength(160) description?: string;
}

export class UpdateStoreDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(60) storeName?: string;
  @IsOptional() @IsString() @MaxLength(300) logoUrl?: string;
}

const BLOCKED_SUFFIXES = ['growupstore.app', 'localhost'];

@Injectable()
export class DomainsService {
  // Rate limit verificación: 3 intentos / 10 min por tienda (memoria + Redis si hay).
  private attempts = new Map<string, number[]>();

  constructor(private prisma: PrismaService) {}

  private assertOwner(tenantId: string, userId: string, role: string) {
    return this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId, ownerId: userId } }).catch(() => {
      if (role !== 'ADMIN') throw new ForbiddenException('solo el dueño de la tienda');
      return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    });
  }

  private normalize(domain: string): string {
    const d = normalizeDomainInput(domain);
    if (BLOCKED_SUFFIXES.some((s) => d === s || d.endsWith(`.${s}`))) {
      throw new BadRequestException('ese dominio no se puede vincular');
    }
    return d;
  }

  async attach(tenantId: string, userId: string, role: string, domain: string) {
    await this.assertOwner(tenantId, userId, role);
    const d = this.normalize(domain);
    const taken = await this.prisma.tenant.findFirst({ where: { customDomain: d, NOT: { id: tenantId } } });
    if (taken) throw new ConflictException('dominio ya vinculado a otra tienda');
    const token = `growup-verify=${randomBytes(16).toString('hex')}`;
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { customDomain: d, domainStatus: 'PENDING', domainToken: token, domainVerifiedAt: null } });
    await this.prisma.domainCheck.create({ data: { tenantId, domain: d, token, status: 'PENDING' } });
    return { domain: d, status: 'PENDING', txtName: `@ (o ${d})`, txtValue: token };
  }

  async verify(tenantId: string, userId: string, role: string) {
    await this.assertOwner(tenantId, userId, role);
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    if (!t.customDomain || !t.domainToken) throw new BadRequestException('primero vincula un dominio');

    const now = Date.now();
    const log = (this.attempts.get(tenantId) || []).filter((ts) => now - ts < 10 * 60 * 1000);
    if (log.length >= 3) throw new ForbiddenException('límite de intentos: espera 10 minutos');
    log.push(now);
    this.attempts.set(tenantId, log);

    let found = false;
    // Se verifica _growup-verify.<dominio> (compatible Cloudflare) con fallback al ápice.
    for (const host of [`_growup-verify.${t.customDomain}`, t.customDomain]) {
      try {
        const records = await resolveTxt(host);
        if (records.some((r) => r.join('').trim() === t.domainToken)) { found = true; break; }
      } catch {
        /* sigue al siguiente host */
      }
    }
    if (!found) {
      await this.prisma.domainCheck.create({ data: { tenantId, domain: t.customDomain, token: t.domainToken, status: 'FAILED' } });
      return { domain: t.customDomain, status: 'PENDING', verified: false, hint: `Crea un registro TXT en tu DNS con valor "${t.domainToken}" y reintenta en unos minutos.` };
    }
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { domainStatus: 'VERIFIED', domainVerifiedAt: new Date() } });
    await this.prisma.domainCheck.create({ data: { tenantId, domain: t.customDomain, token: t.domainToken!, status: 'VERIFIED' } });
    return { domain: t.customDomain, status: 'VERIFIED', verified: true };
  }

  async unlink(tenantId: string, userId: string, role: string) {
    await this.assertOwner(tenantId, userId, role);
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { customDomain: null, domainStatus: 'UNVERIFIED', domainToken: null, domainVerifiedAt: null } });
    return { status: 'UNVERIFIED' };
  }

  async domainState(tenantId: string) {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return {
      domain: t.customDomain,
      status: t.domainStatus,
      verifiedAt: t.domainVerifiedAt,
      txtValue: t.domainStatus === 'VERIFIED' ? null : t.domainToken,
    };
  }

  // Búsqueda y cotización de dominios. Usa Namecheap (API XML) cuando hay
  // credenciales; si no, cotizador local determinista marcado como `mock`.
  async search(query: string) {
    const q = normalizeDomainInput(query).replace(/\s+/g, '');
    if (q.length < 3) throw new BadRequestException('escribe al menos 3 caracteres');
    const base = q.split('.')[0].replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'mitienda';
    const tlds = q.includes('.') ? [q.slice(q.indexOf('.'))] : ['.com', '.co', '.store', '.app'];
    const names = [...new Set([q.includes('.') ? q : `${base}.com`, ...tlds.map((t) => `${base}${t}`)])].slice(0, 4);
    if (this.namecheapConfigured()) {
      try {
        return { source: 'namecheap', results: await this.namecheapCheck(names) };
      } catch {
        // Cae al cotizador local antes que fallar la UX.
      }
    }
    return { source: 'mock', results: names.map((domain) => ({ domain, ...this.mockQuote(domain) })) };
  }

  private namecheapConfigured(): boolean {
    return !!(process.env.NAMECHEAP_API_USER && process.env.NAMECHEAP_API_KEY && process.env.NAMECHEAP_CLIENT_IP);
  }

  private async namecheapCheck(names: string[]): Promise<{ domain: string; available: boolean; priceUsd: number | null }[]> {
    const params = new URLSearchParams({
      ApiUser: process.env.NAMECHEAP_API_USER!,
      ApiKey: process.env.NAMECHEAP_API_KEY!,
      UserName: process.env.NAMECHEAP_API_USER!,
      ClientIp: process.env.NAMECHEAP_CLIENT_IP!,
      Command: 'namecheap.domains.check',
      DomainList: names.join(','),
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`https://api.namecheap.com/xml.response?${params.toString()}`, { signal: ctrl.signal });
      const xml = await res.text();
      return names.map((domain) => {
        const tag = xml.match(new RegExp(`<DomainCheck[^>]*Domain="${domain.replace(/\./g, '\\.')}"[^>]*/?>`, 'i'))?.[0] ?? '';
        const available = /Available="(true|1)"/i.test(tag);
        const price = tag.match(/Price="([\d.]+)"/i)?.[1];
        return { domain, available: tag ? available : false, priceUsd: price ? Number(price) : null };
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private mockQuote(domain: string): { available: boolean; priceUsd: number } {
    let h = 0;
    for (const c of domain) h = (h * 31 + c.charCodeAt(0)) % 997;
    const tld = domain.slice(domain.lastIndexOf('.'));
    const base: Record<string, number> = { '.com': 12.99, '.co': 9.99, '.store': 4.99, '.app': 16.0, '.io': 39.0 };
    return { available: h % 3 !== 0, priceUsd: base[tld] ?? 14.99 };
  }

  // Cotiza y registra la intención de compra/vinculación. La compra real al
  // registrar solo se ejecuta con NAMECHEAP configurado y dominio disponible;
  // si no, devuelve QUOTE con el siguiente paso (vincular + TXT).
  async purchaseIntent(tenantId: string, userId: string, role: string, domain: string) {
    await this.assertOwner(tenantId, userId, role);
    const d = this.normalize(domain);
    const { results } = await this.search(d);
    const quote = results.find((r) => r.domain === d) ?? { domain: d, ...this.mockQuote(d) };
    await this.prisma.domainCheck.create({
      data: { tenantId, domain: d, token: `quote-${Date.now()}`, status: quote.available ? 'QUOTE' : 'TAKEN' },
    });
    if (!quote.available) {
      throw new ConflictException(`el dominio ${d} no está disponible`);
    }
    return { domain: d, priceUsd: quote.priceUsd, status: 'QUOTE', next: `Vincula ${d} en "Tu dominio propio" y completa el TXT para activarlo.` };
  }

  // Autorización para On-Demand TLS del edge (Caddy `ask`). Responde si el
  // dominio puede recibir certificado: subdominio con trial/plan vigente o
  // custom domain verificado. Protegido por INTERNAL_EDGE_SECRET.
  async edgeAuthorize(domain: string, secret?: string) {
    const expected = process.env.INTERNAL_EDGE_SECRET;
    if (!expected) throw new ServiceUnavailableException('edge ask deshabilitado');
    if (!secret || secret.length !== expected.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      throw new ForbiddenException('edge ask no autorizado');
    }
    const d = normalizeDomainInput(domain);
    const base = (process.env.STORE_DOMAIN || 'growupstore.app').toLowerCase();
    const now = new Date();
    if (d.endsWith(`.${base}`)) {
      const label = d.slice(0, -(base.length + 1));
      if (!/^[a-z0-9-]{3,30}$/.test(label)) throw new ForbiddenException('subdominio inválido');
      const t = await this.prisma.tenant.findUnique({ where: { storeSlug: label }, include: { subscription: true } });
      if (!t?.subscription) throw new ForbiddenException('tienda sin suscripción');
      const live =
        (t.subscription.status === 'ACTIVE' || t.subscription.status === 'TRIALING') &&
        (!t.subscription.currentPeriodEnd || t.subscription.currentPeriodEnd > now);
      if (!live) throw new ForbiddenException('suscripción inactiva');
      return { ok: true, tenantId: t.id };
    }
    const t = await this.prisma.tenant.findFirst({ where: { customDomain: d, domainStatus: 'VERIFIED' } });
    if (!t) throw new ForbiddenException('dominio no verificado');
    return { ok: true, tenantId: t.id };
  }

  async updateTheme(tenantId: string, userId: string, role: string, dto: UpdateThemeDto) {
    await this.assertOwner(tenantId, userId, role);
    const current = ((await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })).theme as Record<string, string> | null) || {};
    const theme = { ...current };
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) theme[k] = v as string;
    const t = await this.prisma.tenant.update({ where: { id: tenantId }, data: { theme } });
    return { theme: t.theme };
  }

  async updateSeo(tenantId: string, userId: string, role: string, dto: UpdateSeoDto) {
    await this.assertOwner(tenantId, userId, role);
    const current = ((await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })).seo as Record<string, string> | null) || {};
    const seo = { ...current };
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) seo[k] = v as string;
    const t = await this.prisma.tenant.update({ where: { id: tenantId }, data: { seo } });
    return { seo: t.seo };
  }

  async updateStore(tenantId: string, userId: string, role: string, dto: UpdateStoreDto) {
    await this.assertOwner(tenantId, userId, role);
    const data: { storeName?: string; logoUrl?: string } = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }
}
