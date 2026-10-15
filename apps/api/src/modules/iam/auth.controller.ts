import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser, TenantUser } from '../../common/current-user.decorator';

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('gs_access', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: ACCESS_MAX_AGE, path: '/' });
  res.cookie('gs_refresh', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: REFRESH_MAX_AGE, path: '/api/v1/auth' });
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.register(dto.email, dto.password, dto.name, dto.storeSlug);
    setAuthCookies(res, out.accessToken, out.refreshToken);
    return out;
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, out.accessToken, out.refreshToken);
    return out;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: TenantUser) {
    return this.auth.me(user.userId);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    // Prioridad: cookie httpOnly; fallback body (compat localStorage).
    const token = req.cookies?.gs_refresh || body?.refreshToken;
    if (!token) throw new UnauthorizedException('refresh_required');
    const out = await this.auth.refresh(token, true);
    setAuthCookies(res, out.accessToken, out.refreshToken);
    return out;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('gs_access', { path: '/' });
    res.clearCookie('gs_refresh', { path: '/api/v1/auth' });
    return { ok: true };
  }
}
