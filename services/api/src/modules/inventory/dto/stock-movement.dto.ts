import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const STOCK_MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'adjustment',
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export class StockInDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory item ID',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 50, description: 'Quantity to add to stock' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Monthly restock from supplier',
    description: 'Reason for the stock-in',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: 'PO-2026-001',
    description: 'Purchase order or invoice reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}

export class StockOutDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory item ID',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 10, description: 'Quantity to remove from stock' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Used for Room 201 maintenance',
    description: 'Reason for the stock-out',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class StockAdjustmentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory item ID',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    example: 42,
    description: 'New absolute stock quantity after adjustment',
  })
  @IsInt()
  @Min(0)
  newQuantity: number;

  @ApiPropertyOptional({
    example: 'Physical count correction',
    description: 'Reason for the stock adjustment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class StockMovementDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory item ID',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 10, description: 'Movement quantity' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 'stock_in',
    enum: STOCK_MOVEMENT_TYPES,
    description: 'Type of stock movement',
  })
  @IsIn(STOCK_MOVEMENT_TYPES)
  type: StockMovementType;

  @ApiPropertyOptional({
    example: 'Monthly restock',
    description: 'Reason for the movement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: 'PO-2026-001',
    description: 'External reference (PO number, invoice, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
