import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { TaskStatus } from './dto/update-task-status.dto';

@Injectable()
export class HousekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new housekeeping task for a room.
   */
  async createTask(tenantId: string, dto: CreateHousekeepingTaskDto) {
    // Verify room exists within the tenant
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, tenantId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${dto.roomId}" not found`);
    }

    return this.prisma.housekeepingTask.create({
      data: {
        tenantId,
        roomId: dto.roomId,
        assignedTo: dto.assignedTo,
        priority: dto.priority,
        notes: dto.notes,
      },
      include: {
        room: true,
      },
    });
  }

  /**
   * List housekeeping tasks with filters and pagination.
   */
  async listTasks(
    tenantId: string,
    filters?: {
      status?: string;
      roomId?: string;
      assignedTo?: string;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const {
      status,
      roomId,
      assignedTo,
      priority,
      dateFrom,
      dateTo,
      skip = 0,
      take = 50,
    } = filters || {};

    const where: Prisma.HousekeepingTaskWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (priority) {
      where.priority = priority;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.housekeepingTask.findMany({
        where,
        skip,
        take,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          room: true,
        },
      }),
      this.prisma.housekeepingTask.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Get a single housekeeping task by ID.
   */
  async getTask(tenantId: string, id: string) {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id, tenantId },
      include: {
        room: true,
      },
    });

    if (!task) {
      throw new NotFoundException(
        `Housekeeping task with ID "${id}" not found`,
      );
    }

    return task;
  }

  /**
   * Update the status of a housekeeping task.
   *
   * Status transitions:
   *   pending -> in_progress: sets startedAt
   *   in_progress -> done: sets completedAt, updates room status from 'dirty' to 'available'
   *   pending -> done: sets both startedAt and completedAt, updates room status
   */
  async updateTaskStatus(
    tenantId: string,
    taskId: string,
    status: TaskStatus,
    userId: string,
  ) {
    const task = await this.getTask(tenantId, taskId);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['in_progress', 'done'],
      in_progress: ['done'],
      done: [], // Terminal state; no further transitions allowed
    };

    const allowedNextStatuses = validTransitions[task.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${task.status}" to "${status}". Allowed transitions: ${allowedNextStatuses?.join(', ') || 'none'}`,
      );
    }

    const now = new Date();
    const updateData: Prisma.HousekeepingTaskUpdateInput = { status };

    // Set startedAt when moving to in_progress (or directly to done from pending)
    if (status === 'in_progress' || (status === 'done' && task.status === 'pending')) {
      updateData.startedAt = task.startedAt || now;
    }

    // Set completedAt when moving to done
    if (status === 'done') {
      updateData.completedAt = now;
    }

    // Use a transaction when completing a task to also update the room status
    if (status === 'done') {
      return this.prisma.$transaction(async (tx) => {
        const updatedTask = await tx.housekeepingTask.update({
          where: { id: taskId },
          data: updateData,
          include: { room: true },
        });

        // Update room status from 'dirty' to 'available' when task is completed
        if (updatedTask.room.status === 'dirty') {
          await tx.room.update({
            where: { id: updatedTask.roomId },
            data: { status: 'available' },
          });

          // Reload the task with updated room data
          return tx.housekeepingTask.findFirst({
            where: { id: taskId },
            include: { room: true },
          });
        }

        return updatedTask;
      });
    }

    return this.prisma.housekeepingTask.update({
      where: { id: taskId },
      data: updateData,
      include: { room: true },
    });
  }

  /**
   * Assign a task to a staff member.
   */
  async assignTask(tenantId: string, taskId: string, assignedTo: string) {
    await this.getTask(tenantId, taskId);

    return this.prisma.housekeepingTask.update({
      where: { id: taskId },
      data: { assignedTo },
      include: { room: true },
    });
  }

  /**
   * Get all housekeeping tasks for a specific room.
   */
  async getTasksByRoom(tenantId: string, roomId: string) {
    // Verify room exists within the tenant
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, tenantId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${roomId}" not found`);
    }

    return this.prisma.housekeepingTask.findMany({
      where: { tenantId, roomId },
      orderBy: { createdAt: 'desc' },
      include: { room: true },
    });
  }

  /**
   * Get all housekeeping tasks for a specific staff member.
   */
  async getTasksByStaff(tenantId: string, assignedTo: string) {
    return this.prisma.housekeepingTask.findMany({
      where: { tenantId, assignedTo },
      orderBy: [
        { status: 'asc' }, // pending and in_progress first
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: { room: true },
    });
  }
}
