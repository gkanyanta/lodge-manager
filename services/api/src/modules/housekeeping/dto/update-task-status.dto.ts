import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export class UpdateTaskStatusDto {
  @ApiProperty({
    example: 'in_progress',
    enum: TASK_STATUSES,
    description: 'New task status',
  })
  @IsIn(TASK_STATUSES)
  status: TaskStatus;
}
