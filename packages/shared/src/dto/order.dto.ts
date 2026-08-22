import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from '../state-machine';

export class AddressInput {
  @IsString() @MaxLength(160) line1!: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsOptional() @IsString() @MaxLength(120) landmark?: string;
  @IsString() @Matches(/^[1-9][0-9]{5}$/) pincode!: string;
  @IsString() @MaxLength(80) city!: string;
  @IsString() @MaxLength(80) state!: string;
  @IsString() @MaxLength(120) contactName!: string;
  @IsString() @Matches(/^\+?[0-9]{7,15}$/) contactPhone!: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

/**
 * Order creation consumes a quoteToken. The pincodes on the addresses must
 * match the quoted pincodes, and the server re-verifies pricing is unchanged —
 * a changed configuration yields 409 QUOTE_STALE. That is how "charge shown
 * before confirmation" becomes a guarantee, not just a screen.
 */
export class CreateOrderDto {
  @IsString() quoteToken!: string;

  @ValidateNested() @Type(() => AddressInput) pickupAddress!: AddressInput;
  @ValidateNested() @Type(() => AddressInput) dropAddress!: AddressInput;

  @IsOptional() @IsDateString() promisedDate?: string;

  /** Admin only: place the order on behalf of this customer (user id). */
  @IsOptional() @IsString() onBehalfOfCustomerId?: string;
}

// Status values an actor may target (terminal transitions validated server-side).
const TARGETABLE = ORDER_STATUSES.filter((s) => s !== 'CREATED');

export class UpdateStatusDto {
  @IsEnum(Object.fromEntries(TARGETABLE.map((s) => [s, s])) as Record<string, string>, {
    message: `toStatus must be one of ${TARGETABLE.join(', ')}`,
  })
  toStatus!: OrderStatus;

  @IsOptional() @IsString() @MaxLength(280) reason?: string;
  @IsOptional() @IsString() @MaxLength(40) failureReasonCode?: string;
}

export class AssignDto {
  @IsOptional() @IsString() agentId?: string;
  /** When "AUTO", the assignment engine chooses the best eligible agent. */
  @IsOptional() @IsString() strategy?: 'AUTO';
}

export class RescheduleDto {
  @IsDateString() requestedDate!: string;
}

export class UpdateAvailabilityDto {
  @IsEnum({ AVAILABLE: 'AVAILABLE', ON_DUTY: 'ON_DUTY', OFFLINE: 'OFFLINE' })
  availability!: 'AVAILABLE' | 'ON_DUTY' | 'OFFLINE';
}

export class UpdateLocationDto {
  @IsNumber() @Min(-90) lat!: number;
  @IsNumber() @Min(-180) lng!: number;
}
