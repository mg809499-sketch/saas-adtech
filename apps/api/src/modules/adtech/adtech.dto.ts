import { IsInt, IsObject, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class ConnectMetaDto {
  @IsString()
  @MinLength(8)
  accessToken!: string;

  // Identificadores del negocio (Meta Business Suite). Opcionales para no
  // romper clientes viejos, pero el estado solo es "conectado" con los 3.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessManagerId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^act_\d+$/, { message: 'adAccountId debe tener formato act_123…' })
  adAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pixelId?: string;
}

export class CreateCampaignDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(5)
  dailyBudget!: number;

  @IsOptional()
  @IsObject()
  targeting?: Record<string, unknown>;
}
