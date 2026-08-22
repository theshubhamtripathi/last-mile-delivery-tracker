import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { OrderType } from './auth.dto';

export enum PaymentType {
  PREPAID = 'PREPAID',
  COD = 'COD',
}

/**
 * A quote request. Zones are resolved server-side from the pincodes (with an
 * optional lat/lng geospatial fallback), so the client never asserts a zone.
 * Dimensions are whole centimetres; weight is grams; declared value is paise.
 */
export class QuoteRequestDto {
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'pickupPincode must be a 6-digit Indian pincode' })
  pickupPincode!: string;

  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'dropPincode must be a 6-digit Indian pincode' })
  dropPincode!: string;

  @IsInt() @Min(1) @Max(1000) lengthCm!: number;
  @IsInt() @Min(1) @Max(1000) breadthCm!: number;
  @IsInt() @Min(1) @Max(1000) heightCm!: number;
  @IsInt() @Min(1) @Max(10_000_000) actualWeightGrams!: number;

  @IsEnum(OrderType) orderType!: OrderType;
  @IsEnum(PaymentType) paymentType!: PaymentType;

  @IsOptional() @IsInt() @Min(0) declaredValuePaise?: number;

  // Optional coordinates enabling the geospatial zone fallback.
  @IsOptional() @IsNumber() @Type(() => Number) pickupLat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) pickupLng?: number;
  @IsOptional() @IsNumber() @Type(() => Number) dropLat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) dropLng?: number;
}
