import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Users } from '../../users/entities/users.entity';

interface RequestWithUser extends FastifyRequest {
  user: Users;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Users => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
