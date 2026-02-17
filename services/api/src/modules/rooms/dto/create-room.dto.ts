import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room type ID',
  })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: '101', description: 'Room number' })
  @IsString()
  @MaxLength(20)
  number: string;

  @ApiPropertyOptional({ example: '1', description: 'Floor number or name' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  floor?: string;

  @ApiPropertyOptional({
    example: 'Corner room with extra window',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
