import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiPropertyOptional({
    description: 'Reservation to link the payment to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4')
  reservationId?: string;

  @ApiProperty({
    description: 'Payment amount in the tenant currency',
    example: 250.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'online'],
    example: 'cash',
  })
  @IsString()
  @IsIn(['cash', 'card', 'mobile_money', 'bank_transfer', 'online'])
  method: string;

  @ApiPropertyOptional({
    description: 'Optional description or note',
    example: 'Deposit for weekend stay',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
