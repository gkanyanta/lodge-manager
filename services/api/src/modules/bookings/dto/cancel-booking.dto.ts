import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({
    example: 'Doe',
    description: 'Guest last name for verification',
  })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    example: 'Change of plans',
    description: 'Reason for cancellation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
