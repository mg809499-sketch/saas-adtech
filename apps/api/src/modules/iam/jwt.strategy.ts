import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

function cookieOrBearerExtractor(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }) {
  if (req?.cookies?.gs_access) return req.cookies.gs_access;
  const h = req?.headers?.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieOrBearerExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }
  validate(payload: { sub: string; tenant_id: string; role: string; email: string }) {
    return { userId: payload.sub, tenantId: payload.tenant_id, role: payload.role, email: payload.email };
  }
}
