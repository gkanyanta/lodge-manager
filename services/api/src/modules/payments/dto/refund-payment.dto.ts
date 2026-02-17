import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description:
      'Amount to refund. If omitted, the full original payment amount is refunded.',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for the refund',
    example: 'Guest cancelled within free-cancellation window',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
