import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    // Public endpoints still need tenant context but don't need auth
    if (!request.tenantId && !isPublic) {
      throw new ForbiddenException('Tenant context required');
    }

    // If user is authenticated, verify they belong to this tenant
    if (request.user && request.tenantId) {
      if (
        request.user.tenantId !== request.tenantId &&
        !request.user.roles?.includes('super_admin')
      ) {
        throw new ForbiddenException('Access denied for this tenant');
      }
    }

    return true;
  }
}
