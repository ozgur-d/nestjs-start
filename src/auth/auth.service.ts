import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DateTime } from 'luxon';
import { MoreThan, Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionTokens } from './entities/session-tokens.entity';
import { ClientInfo as IClientInfo } from './interfaces/client-info.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRATION: number;
  private readonly REFRESH_TOKEN_EXPIRATION: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(SessionTokens)
    private readonly sessionTokenRepository: Repository<SessionTokens>,
  ) {
    this.ACCESS_TOKEN_EXPIRATION = this.configService.getOrThrow<number>('JWT_EXPIRES_IN', 15);
    this.REFRESH_TOKEN_EXPIRATION = this.configService.getOrThrow<number>(
      'REFRESH_EXPIRES_IN',
      7 * 24 * 60,
    );
  }

  async login(loginInfo: LoginDto, clientInfo: IClientInfo): Promise<LoginResponseDto> {
    const user = await this.usersService.validateUserCredentials(loginInfo);
    if (!user) {
      throw new UnauthorizedException('Invalid user credentials');
    }
    try {
      return await this.createTokens(user, clientInfo);
    } catch {
      throw new UnauthorizedException('Token generation error');
    }
  }

  async logout(accessToken: string): Promise<void> {
    await this.invalidateToken(accessToken);
  }

  async refreshAccessToken(
    refreshToken: string,
    clientInfo: IClientInfo,
  ): Promise<LoginResponseDto> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: {
        refresh_token: refreshToken.trim(),
        expires_refresh_at: MoreThan(DateTime.now().toJSDate()),
      },
      relations: ['user'],
    });

    if (!sessionToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Validate user-agent and IP address
    if (
      sessionToken.user_agent !== clientInfo.userAgent ||
      sessionToken.ip_address !== clientInfo.ipAddress
    ) {
      throw new UnauthorizedException('Session validation failed');
    }

    try {
      // Expire old refresh token
      await this.invalidateToken(sessionToken.access_token);
      return await this.createTokens(sessionToken.user, clientInfo);
    } catch {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async register(registerInfo: RegisterDto, clientInfo: IClientInfo): Promise<LoginResponseDto> {
    const existingUser = await this.usersService.getUserByUsername(registerInfo.username);
    if (existingUser) {
      throw new UnauthorizedException('This username is already in use');
    }
    const createdUser = await this.usersService.createUser(registerInfo);
    try {
      return await this.createTokens(createdUser, clientInfo);
    } catch {
      throw new UnauthorizedException('Token generation error');
    }
  }

  private async createTokens(user: Users, clientInfo: IClientInfo): Promise<LoginResponseDto> {
    // Generate unique JWT ID for token uniqueness
    const jti = crypto.randomUUID();

    // Generate all tokens and timestamps BEFORE database operation
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: [user.role],
      jti,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${this.ACCESS_TOKEN_EXPIRATION}m`,
    });

    const refreshToken = this.generateRefreshToken();

    const expiresAt = DateTime.now().plus({ minutes: this.ACCESS_TOKEN_EXPIRATION }).toJSDate();

    const refreshTokenExpiration = DateTime.now()
      .plus({ minutes: this.REFRESH_TOKEN_EXPIRATION })
      .toJSDate();

    // Create session token entity
    const sessionToken = new SessionTokens();
    sessionToken.user = user;
    sessionToken.access_token = accessToken;
    sessionToken.refresh_token = refreshToken;
    sessionToken.expires_at = expiresAt;
    sessionToken.expires_refresh_at = refreshTokenExpiration;
    sessionToken.ip_address = clientInfo.ipAddress;
    sessionToken.original_ip_address = clientInfo.originalIpAddress;
    sessionToken.user_agent = clientInfo.userAgent;
    sessionToken.is_proxy = clientInfo.isProxy;

    // Save to database (TypeORM handles transaction internally)
    await this.sessionTokenRepository.save(sessionToken);

    // Build response
    const response = new LoginResponseDto();
    response.access_token = accessToken;
    response.expires_at = expiresAt;
    response.refresh_token = refreshToken;
    response.refresh_token_expires_at = refreshTokenExpiration;

    return response;
  }

  private generateRefreshToken(): string {
    const uuid = crypto.randomUUID();
    const randomBytes = crypto.randomBytes(16);
    const timestamp = Date.now().toString(36);
    const combined = `${uuid}-${randomBytes.toString('base64url')}-${timestamp}`;
    return combined;
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
