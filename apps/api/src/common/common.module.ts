import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [JwtAuthGuard, TenantGuard, RolesGuard, RedisService],
  exports: [JwtAuthGuard, TenantGuard, RolesGuard, RedisService],
})
export class CommonModule {}
