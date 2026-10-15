import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  @Get()
  async check() {
    let db = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch { /* down */ }
    const redis = this.redis.isReady() ? "up" : "degraded";
    return { status: db === "up" ? "ok" : "down", db, redis, ts: new Date().toISOString() };
  }
}
