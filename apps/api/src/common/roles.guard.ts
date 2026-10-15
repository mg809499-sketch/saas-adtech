import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Solo rol ADMIN (consola plataforma GrowUp).
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== 'ADMIN') throw new ForbiddenException('solo administración de plataforma');
    return true;
  }
}
