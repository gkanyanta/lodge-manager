import { IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchAvailabilityDto {
  @ApiProperty({
    example: '2026-03-15',
    description: 'Check-in date (ISO date string)',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2026-03-18',
    description: 'Check-out date (ISO date string)',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({
    example: 2,
    description: 'Number of guests',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests: number;
}
