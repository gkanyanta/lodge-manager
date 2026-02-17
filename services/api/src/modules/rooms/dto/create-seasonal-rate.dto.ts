import {
  IsString,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSeasonalRateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room type ID',
  })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 'Peak Season', description: 'Seasonal rate name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 1.5,
    description: 'Price multiplier (e.g. 1.50 = 50% markup)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  multiplier: number;

  @ApiProperty({
    example: '2026-12-15',
    description: 'Start date (ISO date string)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2027-01-05',
    description: 'End date (ISO date string)',
  })
  @IsDateString()
  endDate: string;
}
