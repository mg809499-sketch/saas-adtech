import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// Cliente privilegiado SOLO para flujos explícitamente cross-tenant:
// login global (email→usuario), vitrina pública (by-slug/public),
// consola admin (métricas agregadas) y cron de expiración de reservas.
// Corre con un rol que hace bypass de RLS (superuser/BYPASSRLS en dev;
// rol dedicado con BYPASSRLS en prod). Cada call-site debe citar su flujo.
@Injectable()
export class PrismaSystemService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.get<string>('SYSTEM_DATABASE_URL');
    if (!url) {
      throw new Error(
        'SYSTEM_DATABASE_URL requerido (flujos cross-tenant: login, vitrina pública, admin, cron). ' +
          'En local apunta al superuser de docker-compose; en prod a un rol con BYPASSRLS.',
      );
    }
    super({ datasources: { db: { url } } });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
