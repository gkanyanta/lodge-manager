import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
  IsDateString,
  IsEmail,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE = 'online',
  PAY_AT_LODGE = 'pay_at_lodge',
}

@ValidatorConstraint({ name: 'AtLeastEmailOrPhone', async: false })
export class AtLeastEmailOrPhoneConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as GuestInfoDto;
    return !!(obj.email || obj.phone);
  }

  defaultMessage() {
    return 'At least one of email or phone must be provided';
  }
}

export class RoomRequestDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room type ID',
  })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 1, description: 'Number of rooms requested' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GuestInfoDto {
  @ApiProperty({ example: 'John', description: 'Guest first name' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Guest last name' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Guest email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+265991234567',
    description: 'Guest phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @Validate(AtLeastEmailOrPhoneConstraint)
  private readonly _atLeastEmailOrPhone?: undefined;
}

export class CreateBookingDto {
  @ApiProperty({
    example: '2026-03-01',
    description: 'Check-in date (ISO date string)',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2026-03-05',
    description: 'Check-out date (ISO date string)',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({
    type: [RoomRequestDto],
    description: 'List of room type requests with quantities',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomRequestDto)
  rooms: RoomRequestDto[];

  @ApiProperty({
    type: GuestInfoDto,
    description: 'Guest contact information',
  })
  @ValidateNested()
  @Type(() => GuestInfoDto)
  guest: GuestInfoDto;

  @ApiPropertyOptional({
    example: 'Late check-in around 10pm',
    description: 'Special requests or notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.PAY_AT_LODGE,
    description: 'Payment method for the booking',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
