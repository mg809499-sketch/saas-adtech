import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PrismaSystemService } from '../../common/prisma-system.service';
import * as bcrypt from 'bcryptjs';

const DEMO_TENANT_SLUG = 'growup-demo';

@Injectable()
export class UsersService {
  // prisma = rol app (RLS vinculante, siempre con withTenant).
  // system = bypass RLS, solo lecturas cross-tenant o con id ya verificado.
  constructor(
    private prisma: PrismaService,
    private system: PrismaSystemService,
  ) {}

  async demoTenantId(): Promise<string> {
    const t = await this.prisma.tenant.upsert({
      where: { slug: DEMO_TENANT_SLUG },
      update: {},
      create: { name: 'Mi Tienda Deportiva (tenant demo)', slug: DEMO_TENANT_SLUG },
    });
    return t.id;
  }

  async create(tenantId: string, email: string, password: string, name?: string, role: 'CUSTOMER' | 'MERCHANT' = 'CUSTOMER') {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.create({ data: { tenantId, email: email.toLowerCase(), name, passwordHash, role } }),
    );
  }

  findByEmail(tenantId: string, email: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findUnique({ where: { tenantId_email: { tenantId, email: email.toLowerCase() } } }),
    );
  }

  // Solo con ids verificados (JWT/refresh firmados): lectura por PK cross-tenant.
  findById(id: string) {
    return this.system.user.findUnique({ where: { id } });
  }

  // Login multi-tenant: el email se busca global y el tenant sale del usuario.
  findByEmailGlobal(email: string) {
    return this.system.user.findFirst({ where: { email: email.toLowerCase() } });
  }
}
