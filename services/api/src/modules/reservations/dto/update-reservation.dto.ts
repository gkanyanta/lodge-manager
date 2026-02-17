import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReservationStatus {
  INQUIRY = 'inquiry',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class UpdateReservationDto {
  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Check-in date (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    example: '2026-03-05',
    description: 'Check-out date (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfGuests?: number;

  @ApiPropertyOptional({
    example: 'Late check-in',
    description: 'Special requests',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;

  @ApiPropertyOptional({
    example: 'Internal note',
    description: 'Internal notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateReservationStatusDto {
  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
    description: 'New reservation status',
  })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
