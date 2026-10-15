import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';
import { BoldMockService } from '../checkout/bold-mock.service';

export class CheckoutPlanDto {
  @IsString()
  planSlug!: string;

  @IsString()
  @IsIn(['PSE', 'CARD', 'NEQUI'])
  paymentMethod!: 'PSE' | 'CARD' | 'NEQUI';
}

const TRIAL_DAYS = 14;

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private bold: BoldMockService,
  ) {}

  plans() {
    return this.prisma.plan.findMany({ orderBy: { priceMonthlyCop: 'asc' } });
  }

  // Compra mock en COP: si Bold aprueba, activa la suscripción del tenant efectivo.
  async checkoutPlan(tenantId: string, dto: CheckoutPlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { slug: dto.planSlug } });
    if (!plan) throw new NotFoundException('plan no existe');
    if (plan.priceMonthlyCop === 0) throw new BadRequestException('ese plan no se compra');
    const mock = this.bold.createPayment(plan.priceMonthlyCop, dto.paymentMethod as never);
    if (mock.status === 'REJECTED') {
      throw new BadRequestException('pago rechazado por Bold (mock)');
    }
    const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const sub = await this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.subscription.upsert({
        where: { tenantId },
        update: { planSlug: plan.slug, status: 'ACTIVE', currentPeriodEnd: end },
        create: { tenantId, planSlug: plan.slug, status: 'ACTIVE', currentPeriodEnd: end },
        include: { plan: true },
      });
      await tx.subscriptionEvent.create({
        data: { subscriptionId: s.id, type: 'plan.activated', meta: { plan: plan.slug, amount: plan.priceMonthlyCop, currency: 'COP', paymentMethod: dto.paymentMethod, boldTx: mock.boldTxId } },
      });
      return s;
    });
    return { subscription: sub, mock };
  }

  async ensureTrialing(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { tenantId } });
      if (existing) return existing;
      const end = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
      return tx.subscription.create({
        data: { tenantId, planSlug: 'STARTER', status: 'TRIALING', currentPeriodEnd: end },
        include: { plan: true },
      });
    });
  }
}
