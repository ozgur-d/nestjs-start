import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DateTime } from 'luxon';
import { MoreThan, Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionTokens } from './entities/session-tokens.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN
    ? parseInt(process.env.JWT_EXPIRES_IN)
    : 15; // minutes
  private readonly REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_EXPIRES_IN
    ? parseInt(process.env.REFRESH_EXPIRES_IN)
    : 7 * 24 * 60; // 7 days in minutes
  private readonly REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(SessionTokens)
    private readonly sessionTokenRepository: Repository<SessionTokens>,
  ) {}

  private getClientInfo(request: FastifyRequest): {
    ipAddress: string;
    originalIpAddress: string | null;
    userAgent: string;
    isProxy: boolean;
  } {
    let ipAddress = request.ip;
    let originalIpAddress: string | null = null;
    let isProxy = false;

    // Cloudflare header check (highest priority)
    const cfConnectingIp = request.headers['cf-connecting-ip'];
    if (typeof cfConnectingIp === 'string') {
      originalIpAddress = ipAddress;
      ipAddress = cfConnectingIp;
      isProxy = true;
    }

    // Nginx X-Real-IP header check (secondary priority)
    const realIp = request.headers['x-real-ip'];
    if (typeof realIp === 'string' && !cfConnectingIp) {
      originalIpAddress = ipAddress;
      ipAddress = realIp;
      isProxy = true;
    }

    // X-Forwarded-For header check (lowest priority)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && !cfConnectingIp && !realIp) {
      const ips = forwardedFor.split(',').map((ip) => ip.trim());
      // First IP address is the real client IP
      originalIpAddress = ipAddress;
      ipAddress = ips[0];
      isProxy = true;
    }

    return {
      ipAddress,
      originalIpAddress,
      userAgent: request.headers['user-agent'] || 'Unknown',
      isProxy,
    };
  }

  async login(
    loginInfo: LoginDto,
    reply: FastifyReply,
    request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.validateUserCredentials(loginInfo);
    if (!user) {
      throw new UnauthorizedException('Invalid user credentials');
    }
    try {
      return await this.createTokens(user, reply, request);
    } catch {
      throw new UnauthorizedException('Token generation error');
    }
  }

  async logout(accessToken: string, reply: FastifyReply): Promise<void> {
    await this.invalidateToken(accessToken);
    this.clearRefreshTokenCookie(reply);
  }

  async refreshAccessToken(
    refreshToken: string,
    accessToken: string,
    reply: FastifyReply,
    request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    /* const unsignedToken = request.unsignCookie(refreshToken);
    if (!unsignedToken.valid) {
      this.clearRefreshTokenCookie(reply);
      throw new UnauthorizedException('Invalid cookie signature');
    } */
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: {
        access_token: accessToken,
        refresh_token: refreshToken.trim(),
        expires_refresh_at: MoreThan(DateTime.now().toJSDate()),
      },
      relations: ['user'],
    });

    if (!sessionToken) {
      this.clearRefreshTokenCookie(reply);
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      //expire refresh token
      await this.invalidateToken(accessToken);
      return await this.createTokens(sessionToken.user, reply, request);
    } catch {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async register(
    registerInfo: RegisterDto,
    reply: FastifyReply,
    request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    const existingUser = await this.usersService.getUserByUsername(registerInfo.username);
    if (existingUser) {
      throw new UnauthorizedException('This username is already in use');
    }
    const createdUser = await this.usersService.createUser(registerInfo);
    try {
      return await this.createTokens(createdUser, reply, request);
    } catch {
      throw new UnauthorizedException('Token generation error');
    }
  }

  private async createTokens(
    user: Users,
    reply: FastifyReply,
    request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    const queryRunner = this.sessionTokenRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        roles: [user.role],
        type: 'access',
      };

      const response = new LoginResponseDto();
      response.access_token = this.jwtService.sign(payload, {
        expiresIn: `${this.ACCESS_TOKEN_EXPIRATION}m`,
      });

      const clientInfo = this.getClientInfo(request);

      const refreshToken = await this.generateRefreshToken();

      response.expires_at = DateTime.now()
        .plus({ minutes: this.ACCESS_TOKEN_EXPIRATION })
        .toJSDate();

      const refreshTokenExpiration = DateTime.now()
        .plus({ minutes: this.REFRESH_TOKEN_EXPIRATION })
        .toJSDate();

      const sessionToken = new SessionTokens();
      sessionToken.user = user;
      sessionToken.access_token = response.access_token;
      sessionToken.refresh_token = refreshToken;
      sessionToken.expires_at = response.expires_at;
      sessionToken.expires_refresh_at = refreshTokenExpiration;
      sessionToken.ip_address = clientInfo.ipAddress;
      sessionToken.original_ip_address = clientInfo.originalIpAddress;
      sessionToken.user_agent = clientInfo.userAgent;
      sessionToken.is_proxy = clientInfo.isProxy;

      await queryRunner.manager.save(SessionTokens, sessionToken);
      await queryRunner.commitTransaction();

      this.setRefreshTokenCookie(reply, refreshToken, refreshTokenExpiration);

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private setRefreshTokenCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    //add reply header to refresh-token and refresh-token-expires-at
    reply.header('refresh-token', token);
    reply.header('refresh-token-expires-at', expiresAt.toISOString());
    reply.setCookie(this.REFRESH_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
      expires: expiresAt,
      path: '/api/auth',
      signed: false,
    });
  }

  private clearRefreshTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(this.REFRESH_TOKEN_COOKIE_NAME, {
      path: '/api/auth',
    });
  }

  private async generateRefreshToken(): Promise<string> {
    await Promise.resolve();

    const uuid = crypto.randomUUID();
    const uuidBuffer = Buffer.from(uuid);
    const randomBytes = crypto.randomBytes(12);
    const combined = Buffer.concat([uuidBuffer, randomBytes]);
    const token = combined.toString('base64url');

    return token;
  }

  private async invalidateToken(accessToken: string): Promise<void> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: { access_token: accessToken },
    });

    if (sessionToken) {
      sessionToken.expires_at = DateTime.now().toJSDate();
      sessionToken.expires_refresh_at = DateTime.now().toJSDate();
      await this.sessionTokenRepository.save(sessionToken);
    }
  }

  async validateAccessToken(accessToken: string): Promise<Users> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      const token = await this.sessionTokenRepository.findOne({
        where: {
          access_token: accessToken,
          expires_at: MoreThan(DateTime.now().toJSDate()),
        },
        relations: ['user'],
      });

      if (!token || token.user.id !== payload.sub) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      return token.user;
    } catch {
      throw new UnauthorizedException('Token verification error');
    }
  }
}
