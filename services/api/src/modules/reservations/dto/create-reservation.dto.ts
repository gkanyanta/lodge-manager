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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReservationSource {
  ONLINE = 'online',
  WALK_IN = 'walk_in',
  PHONE = 'phone',
  AGENT = 'agent',
}

export class ReservationRoomDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room type ID',
  })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 1, description: 'Number of rooms of this type' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Specific room ID to assign (optional)',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}

export class CreateReservationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Guest ID',
  })
  @IsUUID()
  guestId: string;

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

  @ApiPropertyOptional({ example: 2, description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfGuests?: number;

  @ApiProperty({
    type: [ReservationRoomDto],
    description: 'Room type selections with quantities',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationRoomDto)
  rooms: ReservationRoomDto[];

  @ApiPropertyOptional({
    example: 'Late check-in around 10pm',
    description: 'Special requests or notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;

  @ApiPropertyOptional({
    enum: ReservationSource,
    default: ReservationSource.WALK_IN,
    description: 'Reservation source',
  })
  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @ApiPropertyOptional({
    example: 'VIP guest, ensure room is ready early',
    description: 'Internal notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
