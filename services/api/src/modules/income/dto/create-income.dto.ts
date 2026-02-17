import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IncomeSource {
  ROOM_REVENUE = 'room_revenue',
  RESTAURANT = 'restaurant',
  BAR = 'bar',
  ACTIVITY = 'activity',
  OTHER = 'other',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

export class CreateIncomeDto {
  @ApiProperty({ example: 250.0, description: 'Income amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Restaurant lunch service', description: 'Income description' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    enum: IncomeSource,
    example: IncomeSource.RESTAURANT,
    description: 'Source of the income',
  })
  @IsEnum(IncomeSource)
  source: IncomeSource;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description: 'Payment method used',
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '2026-02-17', description: 'Date the income was received (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Received from walk-in guests', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
