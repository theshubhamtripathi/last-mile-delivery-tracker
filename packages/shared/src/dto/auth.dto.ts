import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Order type drives which rate card and COD rule apply. */
export enum OrderType {
  B2B = 'B2B',
  B2C = 'B2C',
}

/**
 * Self-registration always creates a CUSTOMER. Agents and admins are created by
 * an admin, so no `role` field is accepted here — privilege can never be
 * requested by the registering party.
 */
export class RegisterDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  // At least one letter and one digit; length floor guards against trivial secrets.
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt truncates beyond 72 bytes; reject rather than silently cut.
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be 7-15 digits, optional +' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsEnum(OrderType)
  defaultOrderType?: OrderType;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
