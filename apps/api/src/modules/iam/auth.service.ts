import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private sign(user: { id: string; tenantId: string; role: string; email: string }) {
    return this.jwt.sign(
      { sub: user.id, tenant_id: user.tenantId, role: user.role, email: user.email },
      { expiresIn: '15m' },
    );
  }

  private signRefresh(user: { id: string }) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET') || this.config.getOrThrow<string>('JWT_SECRET');
    return this.jwt.sign({ sub: user.id, type: 'refresh' }, { secret, expiresIn: '7d' });
  }

  private verifyRefreshToken(token: string): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET') || this.config.getOrThrow<string>('JWT_SECRET');
    const payload = this.jwt.verify(token, { secret }) as { sub: string; type?: string };
    if (payload.type !== 'refresh' || !payload.sub) throw new UnauthorizedException('refresh inválido');
    return payload.sub;
  }

  private shape(user: { id: string; tenantId: string; email: string; name: string | null; role: string }) {
    const { accessToken, refreshToken } = { accessToken: this.sign(user), refreshToken: this.signRefresh(user) };
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role },
    };
  }

  async register(email: string, password: string, name?: string, storeSlug?: string) {
    let tenantId: string;
    if (storeSlug) {
      const store = await this.prisma.tenant.findUnique({ where: { storeSlug } });
      if (!store) throw new ConflictException('tienda no existe');
      tenantId = store.id;
    } else {
      tenantId = await this.users.demoTenantId();
    }
    const exists = await this.users.findByEmail(tenantId, email);
    if (exists) throw new ConflictException('email ya registrado');
    const user = await this.users.create(tenantId, email, password, name);
    return this.shape(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmailGlobal(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('credenciales inválidas');
    }
    return this.shape(user);
  }

  // Reemite el JWT con rol/tenant actuales (tras crear tienda o comprar plan).
  // Acepta userId (compat Bearer) o refreshToken rotativo (cookies).
  async refresh(userIdOrToken: string, isRefreshToken = false) {
    const userId = isRefreshToken ? this.verifyRefreshToken(userIdOrToken) : userIdOrToken;
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('sesión inválida');
    return this.shape(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('sesión inválida');
    return { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role };
  }
}
