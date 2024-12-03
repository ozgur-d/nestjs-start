import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { FastifyReply } from 'fastify';
import { DateTime } from 'luxon';
import { MoreThan, Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionToken } from './entities/session-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN
    ? parseInt(process.env.JWT_EXPIRES_IN)
    : 15; // minutes
  private readonly REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_EXPIRES_IN
    ? parseInt(process.env.REFRESH_EXPIRES_IN)
    : 7 * 24 * 60; // 7 days in minutes
  private readonly COOKIE_NAME = 'refresh_token';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(SessionToken)
    private readonly sessionTokenRepository: Repository<SessionToken>,
  ) {}

  async login(
    loginInfo: LoginDto,
    reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.validateUserCredentials(loginInfo);
    if (!user) {
      throw new UnauthorizedException('Geçersiz kullanıcı bilgileri');
    }
    return this.createTokens(user, reply);
  }

  async logout(accessToken: string, reply: FastifyReply): Promise<void> {
    await this.invalidateToken(accessToken);
    this.clearRefreshTokenCookie(reply);
  }

  async refreshAccessToken(
    refreshToken: string,
    reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: {
        refresh_token: refreshToken.trim(),
        expires_refresh_at: MoreThan(DateTime.now().toJSDate()),
      },
      relations: ['user'],
    });

    if (!sessionToken) {
      this.clearRefreshTokenCookie(reply);
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    // Refresh token rotasyonu - mevcut token'ı geçersiz kıl
    await this.invalidateToken(sessionToken.access_token);

    // Yeni token'lar oluştur
    return this.createTokens(sessionToken.user, reply);
  }

  async register(
    registerInfo: RegisterDto,
    reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const existingUser = await this.usersService.getUserByUsername(
      registerInfo.username,
    );
    if (existingUser) {
      throw new UnauthorizedException('Bu kullanıcı adı zaten kullanımda');
    }
    const createdUser = await this.usersService.createUser(registerInfo);
    return this.createTokens(createdUser, reply);
  }

  private async createTokens(
    user: Users,
    reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: [user.role],
      type: 'access',
    };

    const response = new LoginResponseDto();
    // Access Token oluştur
    response.access_token = this.jwtService.sign(payload, {
      expiresIn: `${this.ACCESS_TOKEN_EXPIRATION}m`,
    });

    // Refresh Token oluştur
    const refreshToken = await this.generateRefreshToken();

    // Süreleri hesapla
    response.expires_at = DateTime.now()
      .plus({ minutes: this.ACCESS_TOKEN_EXPIRATION })
      .toJSDate();

    const refreshTokenExpiration = DateTime.now()
      .plus({ minutes: this.REFRESH_TOKEN_EXPIRATION })
      .toJSDate();

    // Session'ı kaydet
    const sessionToken = new SessionToken();
    sessionToken.user = user;
    sessionToken.access_token = response.access_token;
    sessionToken.refresh_token = refreshToken;
    sessionToken.expires_at = response.expires_at;
    sessionToken.expires_refresh_at = refreshTokenExpiration;
    await this.sessionTokenRepository.save(sessionToken);

    // Refresh token'ı cookie olarak ayarla
    this.setRefreshTokenCookie(reply, refreshToken, refreshTokenExpiration);

    return response;
  }

  private setRefreshTokenCookie(
    reply: FastifyReply,
    token: string,
    expiresAt: Date,
  ): void {
    reply.setCookie(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/api/auth/refresh-token',
      signed: true,
    });
  }

  private clearRefreshTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(this.COOKIE_NAME, {
      path: '/api/auth/refresh-token',
    });
  }

  private async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(40).toString('base64url');
  }

  private async invalidateToken(accessToken: string): Promise<void> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: { access_token: accessToken },
    });

    if (sessionToken) {
      // Token'ları hemen geçersiz kıl
      sessionToken.expires_at = DateTime.now().toJSDate();
      sessionToken.expires_refresh_at = DateTime.now().toJSDate();
      await this.sessionTokenRepository.save(sessionToken);
    }
  }

  async validateAccessToken(accessToken: string): Promise<Users> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Geçersiz token tipi');
      }

      const token = await this.sessionTokenRepository.findOne({
        where: {
          access_token: accessToken,
          expires_at: MoreThan(DateTime.now().toJSDate()),
        },
        relations: ['user'],
      });

      if (!token || token.user.id !== payload.sub) {
        throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
      }

      return token.user;
    } catch (error) {
      throw new UnauthorizedException('Token doğrulama hatası');
    }
  }
}
