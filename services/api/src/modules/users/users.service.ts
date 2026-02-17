import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 12;

/** Fields returned for user queries (excludes passwordHash) */
const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    include: {
      role: {
        select: { id: true, name: true, description: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    // Check for duplicate email within the tenant
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        `A user with email "${dto.email}" already exists in this tenant`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        active: dto.active ?? true,
        ...(dto.roleIds && dto.roleIds.length > 0
          ? {
              roles: {
                create: dto.roleIds.map((roleId) => ({
                  role: { connect: { id: roleId } },
                })),
              },
            }
          : {}),
      },
      select: USER_SELECT,
    });

    return user;
  }

  async findAll(
    tenantId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
      active?: boolean;
    },
  ) {
    const { skip = 0, take = 50, search, active } = params;

    const where: Prisma.UserWhereInput = { tenantId };

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByEmail(tenantId: string, email: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, email },
      select: USER_SELECT,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(tenantId, id);

    // If email is being changed, check for duplicates
    if (dto.email) {
      const duplicate = await this.prisma.user.findFirst({
        where: { tenantId, email: dto.email, NOT: { id } },
      });

      if (duplicate) {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists in this tenant`,
        );
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.active !== undefined) updateData.active = dto.active;

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    // Handle role reassignment within a transaction
    if (dto.roleIds !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        // Remove existing roles
        await tx.userRole.deleteMany({ where: { userId: id } });

        // Assign new roles
        if (dto.roleIds!.length > 0) {
          await tx.userRole.createMany({
            data: dto.roleIds!.map((roleId) => ({
              userId: id,
              roleId,
            })),
          });
        }

        return tx.user.update({
          where: { id },
          data: updateData,
          select: USER_SELECT,
        });
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async deactivate(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Revoke all refresh tokens for the user
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: USER_SELECT,
    });
  }

  async activate(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.user.update({
      where: { id },
      data: { active: true },
      select: USER_SELECT,
    });
  }
}
