import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Deluxe Suite', description: 'Room type name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Spacious suite with mountain view',
    description: 'Room type description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 2, description: 'Maximum number of guests' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxOccupancy: number;

  @ApiProperty({ example: 150.0, description: 'Base price per night' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  basePrice: number;

  @ApiPropertyOptional({
    example: ['wifi', 'air_conditioning', 'minibar'],
    description: 'List of amenities',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/room1.jpg'],
    description: 'Image URLs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
