import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TenantCreateInput) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException(`Tenant with slug "${data.slug}" already exists`);
    }

    return this.prisma.tenant.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    active?: boolean;
  }) {
    const { skip = 0, take = 50, search, active } = params;

    const where: Prisma.TenantWhereInput = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { active: false },
    });
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { active: true },
    });
  }
}
