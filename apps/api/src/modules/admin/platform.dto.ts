import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsString()
  tenantSlug!: string;

  @IsString()
  planSlug!: string;

  @IsOptional()
  @IsIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planSlug?: string;

  @IsOptional()
  @IsIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  status?: string;

  @IsOptional()
  @IsString()
  currentPeriodEnd?: string;
}

export class RenewSubscriptionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}

export class CreatePlanDto {
  @IsString()
  @Transform(({ value }) => String(value ?? '').toUpperCase().trim())
  @Matches(/^[A-Z0-9_]{3,30}$/)
  slug!: string;

  @IsString()
  @MaxLength(60)
  name!: string;

  @IsInt()
  @Min(0)
  priceMonthlyUsd!: number;

  @IsInt()
  @Min(0)
  priceMonthlyCop!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsInt()
  @Min(1)
  maxStores!: number;

  @IsInt()
  maxProducts!: number;

  @IsOptional()
  features?: Record<string, unknown> | null;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyUsd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCop?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStores?: number;

  @IsOptional()
  @IsInt()
  maxProducts?: number;

  @IsOptional()
  features?: Record<string, unknown>;
}

export class UpdateUserRoleDto {
  @IsIn(['CUSTOMER', 'MERCHANT', 'ADMIN'])
  role!: string;
}

export class ResolveCampaignDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class UpdateAgreementDto {
  @IsInt()
  @Min(1)
  @Max(35)
  commissionPct!: number;
}

export class UpdateSettingDto {
  @IsString()
  key!: string;

  @IsOptional()
  value?: unknown;
}

export class SuspendStoreDto {
  @IsIn(['SUSPEND', 'REACTIVATE'])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export function isBooleanLike(v: unknown): v is boolean {
  return typeof v === 'boolean';
}
