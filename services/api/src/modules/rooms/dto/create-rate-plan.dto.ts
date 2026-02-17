import {
  IsString,
  IsUUID,
  IsNumber,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRatePlanDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room type ID',
  })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 'Weekend Special', description: 'Rate plan name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 120.0, description: 'Price per night' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({
    example: '2026-03-01',
    description: 'Start date (ISO date string)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'End date (ISO date string)',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum number of nights',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minNights?: number;
}
