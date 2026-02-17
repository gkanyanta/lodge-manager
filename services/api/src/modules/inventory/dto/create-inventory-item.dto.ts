import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory category ID',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Supplier ID',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ example: 'Bed Sheets - King Size', description: 'Item name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'BED-KS-001',
    description: 'Stock Keeping Unit code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({
    example: 'pcs',
    description: 'Unit of measurement (pcs, kg, litre, etc.)',
  })
  @IsString()
  @MaxLength(20)
  unit: string;

  @ApiProperty({
    example: 10,
    description: 'Minimum stock level before reorder alert',
  })
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @ApiProperty({
    example: 25.5,
    description: 'Cost price per unit',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Inventory category ID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Supplier ID',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    example: 'Bed Sheets - King Size',
    description: 'Item name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'BED-KS-001',
    description: 'Stock Keeping Unit code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    example: 'pcs',
    description: 'Unit of measurement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Minimum stock level before reorder alert',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({
    example: 25.5,
    description: 'Cost price per unit',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the item is active',
  })
  @IsOptional()
  active?: boolean;
}
