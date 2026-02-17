import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExpensePaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

export class CreateExpenseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Expense category ID',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 150.0, description: 'Expense amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Office supplies purchase', description: 'Expense description' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.CASH,
    description: 'Payment method used',
  })
  @IsEnum(ExpensePaymentMethod)
  method: ExpensePaymentMethod;

  @ApiProperty({ example: '2026-02-17', description: 'Date the expense occurred (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'ABC Suppliers', description: 'Vendor or supplier name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/receipts/abc123.jpg',
    description: 'URL to receipt image',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  receipt?: string;

  @ApiPropertyOptional({ example: 'Urgent purchase for guest event', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
