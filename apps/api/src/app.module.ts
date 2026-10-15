import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { z } from 'zod';
import { PrismaModule } from './common/prisma.module';
import { CommonModule } from './common/common.module';
import { IamModule } from './modules/iam/iam.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AdtechModule } from './modules/adtech/adtech.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { BillingModule } from './modules/billing/billing.module';
import { StoresModule } from './modules/stores/stores.module';
import { AdminModule } from './modules/admin/admin.module';
import { DomainsModule } from './modules/domains/domains.module';
import { PagesModule } from './modules/pages/pages.module';
import { FontsModule } from './modules/fonts/fonts.module';
import { HealthController } from './observability/health.controller';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SYSTEM_DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AES_SERVICE_KEY: z.string().min(16),
  BOLD_WEBHOOK_SECRET: z.string().min(1),
  MOCK_PAYMENTS: z.string().default('false'),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  PORT: z.string().default('3000'),
});

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: (c) => envSchema.parse(c),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    IamModule,
    CatalogModule,
    CheckoutModule,
    TenantModule,
    AdtechModule,
    AffiliatesModule,
    BillingModule,
    StoresModule,
    AdminModule,
    DomainsModule,
    PagesModule,
    FontsModule,
  ],
})
export class AppModule {}
