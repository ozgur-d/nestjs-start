import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../../common/enums/role.enum';
import { ROLES_KEY } from '../lib/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private roles: Role[];

  constructor(private reflector: Reflector) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    this.roles = requiredRoles;

    return super.canActivate(context);
  }

  // Define an interface for the expected user structure
  private isUserWithRole(user: any): user is { role: string | string[] } {
    return user && typeof user === 'object' && 'role' in user;
  }

  handleRequest(err: any, user: any): any {
    if (err || !user) {
      throw err || new UnauthorizedException('You should login first');
    }

    //this.role is contains user.role
    if (this.roles && this.roles.length) {
      const hasRole = (): boolean => {
        if (!this.isUserWithRole(user)) {
          return false;
        }

        if (Array.isArray(user.role)) {
          return user.role.some((r) => this.roles.includes(r as Role));
        }

        return this.roles.includes(user.role as Role);
      };

      if (!hasRole()) {
        throw new ForbiddenException('You are not allowed to access this route');
      }
    }

    return user;
  }
}
