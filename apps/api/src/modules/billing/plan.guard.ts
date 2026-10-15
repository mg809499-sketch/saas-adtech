import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PlanService } from './plan.service';

// Bloqueo total sin membresía vigente: exige Subscription ACTIVE/TRIALING no vencida.
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private plans: PlanService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const tenantId: string = req.tenantId ?? req.user?.tenantId;
    const s = await this.plans.statusOf(tenantId);
    if (!s.active) {
      throw new ForbiddenException({ message: 'plan_required: activa tu membresía para operar', code: 'plan_required' });
    }
    req.plan = s;
    return true;
  }
}
