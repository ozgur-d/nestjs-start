import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Users } from '../../users/entities/users.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        //it is possible to use a query parameter to pass the token
        ExtractJwt.fromUrlQueryParameter('access-token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: FastifyRequest): Promise<Users> {
    const authHeader: string | undefined = request.headers?.authorization;

    let queryToken: string | undefined;
    const query = request.query as Record<string, unknown>;
    if (query && typeof query === 'object' && 'access-token' in query) {
      queryToken = query['access-token'] as string;
    }

    let accessToken: string | undefined = authHeader || queryToken;

    if (typeof accessToken === 'string' && accessToken.startsWith('Bearer ')) {
      accessToken = accessToken.replace('Bearer ', '');
    }

    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    const user = await this.authService.validateAccessToken(accessToken);
    return user;
  }
}
