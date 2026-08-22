import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderType } from './auth.dto';
import { PaymentType } from './quote.dto';

export enum RateScope {
  INTRA_ZONE = 'INTRA_ZONE',
  INTER_ZONE = 'INTER_ZONE',
}

export enum SurchargeCalcType {
  FLAT = 'FLAT',
  PERCENT_OF_FREIGHT = 'PERCENT_OF_FREIGHT',
  GREATER_OF = 'GREATER_OF',
}

export class CreateZoneDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @Matches(/^[A-Z0-9-]{2,16}$/, { message: 'code must be uppercase letters, digits or dashes' })
  code!: string;
}

export class UpdateZoneDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateServiceAreaDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @Matches(/^[1-9][0-9]{5}$/) pincode!: string;
  @IsString() @MaxLength(80) city!: string;
  @IsString() @MaxLength(80) state!: string;
  @IsString() zoneId!: string;
  @IsNumber() @Min(-90) @Max(90) centroidLat!: number;
  @IsNumber() @Min(-180) @Max(180) centroidLng!: number;
  @IsOptional() @IsBoolean() isServiceable?: boolean;
}

export class RateSlabInput {
  @IsInt() @Min(0) fromWeightGrams!: number;
  @IsOptional() @IsInt() @Min(1) toWeightGrams?: number | null;
  @IsInt() @Min(0) flatPaise!: number;
  @IsInt() @Min(0) perKgPaise!: number;
  @IsInt() @Min(0) sequence!: number;
}

export class CreateRateCardDto {
  @IsString() @MaxLength(120) name!: string;
  @IsEnum(OrderType) orderType!: OrderType;
  @IsEnum(RateScope) scope!: RateScope;
  @IsOptional() @IsString() originZoneId?: string | null;
  @IsOptional() @IsString() destinationZoneId?: string | null;
  @IsOptional() @IsString() effectiveFrom?: string; // ISO; defaults to now
  @IsArray() @ValidateNested({ each: true }) @Type(() => RateSlabInput)
  slabs!: RateSlabInput[];
}

export class CreateSurchargeRuleDto {
  @IsString() @MaxLength(24) code!: string;
  @IsEnum(OrderType) orderType!: OrderType;
  @IsEnum(SurchargeCalcType) calcType!: SurchargeCalcType;
  @IsOptional() @IsInt() @Min(0) flatPaise?: number;
  @IsOptional() @IsInt() @Min(0) percentBasisPoints?: number;
  @IsOptional() @IsInt() @Min(0) minPaise?: number;
  @IsOptional() @IsInt() @Min(0) maxPaise?: number;
  @IsOptional() @IsString() effectiveFrom?: string;
}

export class UpdatePricingConfigDto {
  @IsOptional() @IsInt() @Min(1) volumetricDivisor?: number;
  @IsOptional() @IsInt() @Min(1) weightRoundingStepGrams?: number;
  @IsOptional() @IsInt() @Min(0) minChargeableWeightGrams?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) fuelSurchargeBasisPoints?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) taxBasisPoints?: number;
}

/** Dry-run a hypothetical shipment against the active (or a given) card set. */
export class SimulateDto {
  @IsInt() @Min(1) @Max(1000) lengthCm!: number;
  @IsInt() @Min(1) @Max(1000) breadthCm!: number;
  @IsInt() @Min(1) @Max(1000) heightCm!: number;
  @IsInt() @Min(1) actualWeightGrams!: number;
  @IsEnum(OrderType) orderType!: OrderType;
  @IsString() pickupZoneId!: string;
  @IsString() dropZoneId!: string;
  @IsOptional() @IsEnum(PaymentType) paymentType?: PaymentType;
  @IsOptional() @IsInt() @Min(0) declaredValuePaise?: number;
}
