import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'Linen World Distributors',
    description: 'Supplier name',
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Contact person name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

  @ApiPropertyOptional({
    example: 'orders@linenworld.com',
    description: 'Supplier email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+1-555-0123',
    description: 'Supplier phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: '123 Supply Chain Ave, Nairobi',
    description: 'Supplier physical address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({
    example: 'Linen World Distributors',
    description: 'Supplier name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Contact person name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

  @ApiPropertyOptional({
    example: 'orders@linenworld.com',
    description: 'Supplier email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+1-555-0123',
    description: 'Supplier phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: '123 Supply Chain Ave, Nairobi',
    description: 'Supplier physical address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the supplier is active',
  })
  @IsOptional()
  active?: boolean;
}
