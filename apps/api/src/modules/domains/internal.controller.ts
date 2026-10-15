import { Controller, Get, Headers, Query } from '@nestjs/common';
import { DomainsService } from './domains.service';

// Endpoint interno para On-Demand TLS del edge (Caddy `ask` o equivalente).
// Solo red privada + INTERNAL_EDGE_SECRET. Sin JwtAuthGuard a propósito:
// la autorización es el secreto compartido del edge.
@Controller('internal')
export class InternalController {
  constructor(private domains: DomainsService) {}

  @Get('caddy-ask')
  ask(@Query('domain') domain = '', @Headers('x-edge-secret') secret?: string) {
    return this.domains.edgeAuthorize(domain, secret);
  }

  @Get('health')
  health() {
    return { ok: true };
  }
}
