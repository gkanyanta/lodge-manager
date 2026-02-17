import { IsString, IsOptional, IsUUID, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export class CreateHousekeepingTaskDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Room ID the task relates to',
  })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'User ID or staff name to assign the task to',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assignedTo?: string;

  @ApiProperty({
    example: 'normal',
    enum: TASK_PRIORITIES,
    description: 'Task priority level',
  })
  @IsIn(TASK_PRIORITIES)
  priority: TaskPriority;

  @ApiPropertyOptional({
    example: 'Deep clean required, guest checked out early',
    description: 'Additional notes or instructions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
