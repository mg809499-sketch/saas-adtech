import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantUser => ctx.switchToHttp().getRequest().user,
);

// Tenant efectivo validado por TenantGuard (header propio) o el del JWT.
// Sin fallback silencioso a demo-tenant: falla explícito (trazabilidad).
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const tenant = req.tenantId ?? req.user?.tenantId;
    if (!tenant) throw new BadRequestException('tenant_required');
    return tenant;
  },
);

// Estado de membresía cargado por PlanGuard (plan + límites).
export const CurrentPlan = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): { maxProducts: number; maxStores: number } => {
    const req = ctx.switchToHttp().getRequest();
    return req.plan?.plan ?? { maxProducts: 100, maxStores: 1 };
  },
);
