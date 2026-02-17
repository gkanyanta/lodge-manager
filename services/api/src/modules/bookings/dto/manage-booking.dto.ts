import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManageBookingDto {
  @ApiProperty({
    example: 'LDG-A1B2C3',
    description: 'Booking reference code',
  })
  @IsString()
  @MaxLength(20)
  bookingReference: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Guest last name for verification',
  })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Verification token for future OTP support',
  })
  @IsOptional()
  @IsString()
  verificationToken?: string;
}
