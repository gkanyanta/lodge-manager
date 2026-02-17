import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Utilities', description: 'Category name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
