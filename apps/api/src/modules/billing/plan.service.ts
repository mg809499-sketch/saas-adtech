import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// Suscripción por tenant. Sin ACTIVE/TRIALING vigente → 402 plan_required.
@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async statusOf(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { tenantId },
        include: { plan: true, tenant: { select: { id: true, name: true, ownerId: true, storeName: true, storeSlug: true } } },
      });
      const now = new Date();
      const live =
        !!sub &&
        (sub.status === 'ACTIVE' || sub.status === 'TRIALING') &&
        (!sub.currentPeriodEnd || sub.currentPeriodEnd > now);
      const [storesOwned, products] = await Promise.all([
        tx.tenant.count({ where: { ownerId: sub?.tenant.ownerId ?? '__none__' } }).catch(() => 0),
        tx.product.count({ where: { tenantId } }),
      ]);
      return {
        active: live,
        status: sub?.status ?? 'NONE',
        plan: sub ? { slug: sub.plan.slug, name: sub.plan.name, maxStores: sub.plan.maxStores, maxProducts: sub.plan.maxProducts } : null,
        tenant: sub?.tenant ?? null,
        usage: { products },
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      };
    });
  }

  async requireActive(tenantId: string): Promise<void> {
    const s = await this.statusOf(tenantId);
    if (!s.active) {
      throw new ForbiddenException({ message: 'plan_required: activa tu membresía para operar', code: 'plan_required' });
    }
  }

  async storesOwnedBy(ownerId: string): Promise<number> {
    return this.prisma.tenant.count({ where: { ownerId } });
  }
}
