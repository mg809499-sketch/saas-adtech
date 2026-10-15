import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Aísla inquilinos: el header x-tenant-id debe ser el tenant del JWT o una
// tienda propia del usuario. Deja el tenant efectivo en req.tenantId.
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['x-tenant-id'];
    const home: string | undefined = req.user?.tenantId;
    if (!header && !home) throw new ForbiddenException('tenant_required');
    if (!header || header === home) {
      if (!home) throw new ForbiddenException('tenant_required');
      req.tenantId = home;
      return true;
    }
    const owned = await this.prisma.tenant.findFirst({
      where: { id: header, ownerId: req.user?.userId },
    });
    if (!owned) throw new ForbiddenException('tenant mismatch');
    req.tenantId = owned.id;
    return true;
  }
}
