import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ROOM_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'dirty',
  'out_of_service',
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export class UpdateRoomStatusDto {
  @ApiProperty({
    example: 'available',
    enum: ROOM_STATUSES,
    description: 'New room status',
  })
  @IsIn(ROOM_STATUSES)
  status: RoomStatus;
}
