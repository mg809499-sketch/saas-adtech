import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RequestAgreementDto {
  // slug de la tienda aliada (ex. growup-aliada). Se acepta el alias
  // `targetSlug` que envía el frontend.
  @IsOptional()
  @IsString()
  targetTenantSlug?: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;

  @IsInt()
  @Min(1)
  @Max(35)
  commissionPct!: number;
}
