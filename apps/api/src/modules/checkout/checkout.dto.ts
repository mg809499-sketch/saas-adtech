import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum CheckoutMethod {
  PSE = 'PSE',
  CARD = 'CARD',
  NEQUI = 'NEQUI',
}

class CheckoutItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  variantId?: string;
}

class ShippingDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;
}

class PaymentDto {
  @IsOptional()
  @IsString()
  bank?: string;

  // Número de prueba; jamás se persiste (solo last4 en el intento).
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  nequiPhone?: string;
}

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ValidateNested()
  @Type(() => ShippingDto)
  shipping!: ShippingDto;

  @IsEnum(CheckoutMethod)
  paymentMethod!: CheckoutMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class MockConfirmDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  approve?: boolean;
}
