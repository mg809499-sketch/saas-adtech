import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AesService } from '../../common/aes.service';
import { PrismaService } from '../../common/prisma.service';
import { MetaStubService } from './meta-stub.service';
import { CreateCampaignDto } from './adtech.dto';

const DEMO_AD_ACCOUNT = 'act_981247192';

// Convierte el payload simplificado (productId, dailyBudget, targeting) en las
// 3 llamadas Meta: campaña → ad set + targeting → creative + anuncio.
@Injectable()
export class AdtechService {
  constructor(
    private prisma: PrismaService,
    private aes: AesService,
    private meta: MetaStubService,
  ) {}

  private assertMerchant(role: string) {
    if (role !== 'MERCHANT' && role !== 'ADMIN') throw new ForbiddenException('solo el comercio gestiona ads');
  }

  async connect(
    tenantId: string,
    role: string,
    accessToken: string,
    ids?: { businessManagerId?: string; adAccountId?: string; pixelId?: string },
  ) {
    this.assertMerchant(role);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metaTokenEnc: this.aes.encrypt(accessToken),
        ...(ids?.businessManagerId !== undefined ? { metaBusinessId: ids.businessManagerId || null } : {}),
        ...(ids?.adAccountId !== undefined ? { metaAdAccount: ids.adAccountId || null } : {}),
        ...(ids?.pixelId !== undefined ? { metaPixel: ids.pixelId || null } : {}),
      },
    });
    return this.status(tenantId);
  }

  async status(tenantId: string) {
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    // "Conectado" solo cuando hay token + cuenta publicitaria + píxel.
    // Sin eso es pendiente de configuración (nunca etiqueta engañosa).
    const connected = !!(t.metaTokenEnc && t.metaAdAccount && t.metaPixel);
    return {
      connected,
      adAccount: t.metaAdAccount ?? DEMO_AD_ACCOUNT,
      pixel: t.metaPixel ?? null,
      businessManagerId: t.metaBusinessId ?? null,
      pending: !connected,
    };
  }

  async create(tenantId: string, role: string, dto: CreateCampaignDto) {
    this.assertMerchant(role);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    if (!tenant.metaTokenEnc) throw new BadRequestException('conecta tu cuenta Meta primero');
    const product = await this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findFirst({ where: { id: dto.productId, tenantId, status: 'PUBLISHED' } }),
    );
    if (!product) throw new NotFoundException('producto no disponible en tu tenant');

    const campaign = await this.prisma.withTenant(tenantId, (tx) =>
      tx.adCampaign.create({
        data: {
          tenantId,
          productId: product.id,
          name: `${product.name} — Express`,
          dailyBudget: dto.dailyBudget,
          targeting: (dto.targeting ?? {}) as Prisma.InputJsonValue,
          status: 'DRAFT',
        },
      }),
    );

    const metaCampaign = this.meta.createCampaign(DEMO_AD_ACCOUNT, campaign.name);
    const metaAdSet = this.meta.createAdSet(DEMO_AD_ACCOUNT, metaCampaign.id, dto.targeting ?? {});
    const metaAd = this.meta.createAd(DEMO_AD_ACCOUNT, metaAdSet.id, product.name);

    return this.prisma.withTenant(tenantId, (tx) =>
      tx.adCampaign.update({
        where: { id: campaign.id },
        // Pasa por revisión antes de activar (state machine explícita).
        data: { metaCampaignId: metaCampaign.id, metaAdsetId: metaAdSet.id, metaAdId: metaAd.id, status: 'PENDING_REVIEW' },
      }),
    );
  }

  list(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.adCampaign.findMany({ where: { tenantId }, include: { product: true }, orderBy: { createdAt: 'desc' } }),
    );
  }

  async setStatus(tenantId: string, role: string, id: string, status: 'ACTIVE' | 'PAUSED') {
    this.assertMerchant(role);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const c = await tx.adCampaign.findFirst({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('campaña no encontrada');
      // Transiciones válidas: PENDING_REVIEW|PAUSED → ACTIVE, ACTIVE → PAUSED.
      if (status === 'ACTIVE' && c.status !== 'PENDING_REVIEW' && c.status !== 'PAUSED') {
        throw new BadRequestException(`transición inválida: ${c.status} → ACTIVE`);
      }
      if (status === 'PAUSED' && c.status !== 'ACTIVE') {
        throw new BadRequestException(`transición inválida: ${c.status} → PAUSED`);
      }
      return tx.adCampaign.update({ where: { id }, data: { status } });
    });
  }
}
