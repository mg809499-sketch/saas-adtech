import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PrismaSystemService } from '../../common/prisma-system.service';
import { RequestAgreementDto } from './affiliates.dto';

@Injectable()
export class AffiliatesService {
  constructor(
    private prisma: PrismaService,
    private system: PrismaSystemService,
  ) {}

  private assertMerchant(role: string) {
    if (role !== 'MERCHANT' && role !== 'ADMIN') throw new ForbiddenException('solo el comercio gestiona alianzas');
  }

  async request(tenantId: string, role: string, dto: RequestAgreementDto) {
    this.assertMerchant(role);
    const raw = (dto.targetTenantSlug ?? dto.targetSlug ?? '').toLowerCase().trim();
    if (!raw) throw new BadRequestException('indica el slug de la tienda aliada');
    const target = await this.prisma.tenant.findFirst({
      where: { OR: [{ storeSlug: raw }, { slug: raw }, { storeSlug: `store-${raw}` }] },
    });
    if (!target) throw new NotFoundException('tienda aliada no encontrada');
    if (target.id === tenantId) throw new BadRequestException('no puedes aliarte contigo mismo');
    const dup = await this.prisma.affiliateAgreement.findFirst({
      where: {
        OR: [
          { sourceTenantId: tenantId, targetTenantId: target.id },
          { sourceTenantId: target.id, targetTenantId: tenantId },
        ],
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });
    if (dup) throw new ConflictException('ya existe una alianza con esa tienda');
    // Par revocado previo: se reactiva en vez de violar el índice único.
    const revoked = await this.prisma.affiliateAgreement.findUnique({
      where: { sourceTenantId_targetTenantId: { sourceTenantId: tenantId, targetTenantId: target.id } },
    });
    if (revoked) {
      return this.prisma.affiliateAgreement.update({
        where: { id: revoked.id },
        data: { status: 'PENDING', commissionPct: dto.commissionPct },
      });
    }
    return this.prisma.affiliateAgreement.create({
      data: { sourceTenantId: tenantId, targetTenantId: target.id, commissionPct: dto.commissionPct, status: 'PENDING' },
    });
  }

  async mine(tenantId: string) {
    const rows = await this.prisma.affiliateAgreement.findMany({
      where: { OR: [{ sourceTenantId: tenantId }, { targetTenantId: tenantId }] },
      orderBy: { createdAt: 'desc' },
    });
    if (rows.length === 0) return [];
    const ids = [...new Set(rows.flatMap((a) => [a.sourceTenantId, a.targetTenantId]))];
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, storeSlug: true, storeName: true },
    });
    const byId = new Map(tenants.map((t) => [t.id, t]));
    return rows.map((a) => ({
      ...a,
      direction: a.sourceTenantId === tenantId ? 'OUTGOING' : 'INCOMING',
      sourceSlug: byId.get(a.sourceTenantId)?.storeSlug ?? a.sourceTenantId,
      targetSlug: byId.get(a.targetTenantId)?.storeSlug ?? a.targetTenantId,
      sourceName: byId.get(a.sourceTenantId)?.storeName ?? null,
      targetName: byId.get(a.targetTenantId)?.storeName ?? null,
    }));
  }

  async accept(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    const a = await this.prisma.affiliateAgreement.findFirst({ where: { id, targetTenantId: tenantId } });
    if (!a) throw new NotFoundException('solicitud no encontrada (solo el aliado acepta)');
    if (a.status !== 'PENDING') throw new BadRequestException('la solicitud ya fue procesada');
    return this.prisma.affiliateAgreement.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async revoke(tenantId: string, role: string, id: string) {
    this.assertMerchant(role);
    const a = await this.prisma.affiliateAgreement.findFirst({
      where: { id, OR: [{ sourceTenantId: tenantId }, { targetTenantId: tenantId }] },
    });
    if (!a) throw new NotFoundException('alianza no encontrada');
    return this.prisma.affiliateAgreement.update({ where: { id }, data: { status: 'REVOKED' } });
  }

  // Directorio central público: productos de tiendas con al menos una alianza ACTIVA.
  // Cross-tenant por diseño → cliente system (lectura pública, sin PII).
  async featuredProducts() {
    const active = await this.prisma.affiliateAgreement.findMany({ where: { status: 'ACTIVE' } });
    const tenantIds = [...new Set(active.flatMap((a) => [a.sourceTenantId, a.targetTenantId]))];
    if (tenantIds.length === 0) return [];
    return this.system.product.findMany({
      where: { tenantId: { in: tenantIds }, status: 'PUBLISHED' },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }
}
