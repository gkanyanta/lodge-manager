import {
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Extract tenant slug from header, subdomain, or query param
    const tenantSlug =
      (req.headers['x-tenant-slug'] as string) ||
      this.extractSubdomain(req) ||
      (req.query['tenant'] as string);

    if (!tenantSlug) {
      // Allow requests without tenant context (e.g., platform-level endpoints)
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.active) {
      throw new NotFoundException('Lodge not found');
    }

    (req as any).tenantId = tenant.id;
    (req as any).tenant = tenant;
    (req as any).tenantSlug = tenantSlug;

    next();
  }

  private extractSubdomain(req: Request): string | null {
    const host = req.headers.host || '';
    const parts = host.split('.');
    // In development: tenant slug via header or query
    // In production: first subdomain part
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}
