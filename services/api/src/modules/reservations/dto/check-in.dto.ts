import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RoomAssignmentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Reservation room entry ID',
  })
  @IsUUID()
  reservationRoomId: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440000',
    description: 'Physical room ID to assign',
  })
  @IsUUID()
  roomId: string;
}

export class CheckInDto {
  @ApiProperty({
    type: [RoomAssignmentDto],
    description: 'Room assignments mapping reservation rooms to physical rooms',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomAssignmentDto)
  roomAssignments: RoomAssignmentDto[];
}
