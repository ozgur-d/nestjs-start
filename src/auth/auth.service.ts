import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import { SessionToken } from './entities/session-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(SessionToken)
    private readonly sessionTokenRepository: Repository<SessionToken>,
  ) {}

  async login(loginInfo: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.validateUserCredentials(loginInfo);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { id: user.id };
    return this.createToken(user, payload);
  }

  async logout(accessToken: string): Promise<void> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: { access_token: accessToken },
    });
    if (sessionToken) {
      sessionToken.expires_at = DateTime.now().toJSDate();
      sessionToken.expires_refresh_at = DateTime.now().toJSDate();
      await this.sessionTokenRepository.save(sessionToken);
    }
  }

  async getAccessToken(refreshToken: string): Promise<LoginResponseDto> {
    const sessionToken = await this.sessionTokenRepository.findOne({
      where: {
        refresh_token: refreshToken,
        expires_refresh_at: MoreThan(DateTime.now().toJSDate()),
      },
      relations: ['user'],
    });

    if (!sessionToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    sessionToken.expires_at = DateTime.now().toJSDate();
    sessionToken.expires_refresh_at = DateTime.now().toJSDate();
    await this.sessionTokenRepository.save(sessionToken);

    const payload = { id: sessionToken.user.id };
    return this.createToken(sessionToken.user, payload);
  }

  async register(registerInfo: RegisterDto): Promise<LoginResponseDto> {
    const user = await this.usersService.getUserByUsername(
      registerInfo.username,
    );
    if (user) {
      throw new UnauthorizedException('User already exists');
    }
    const createdUser = await this.usersService.createUser(registerInfo);
    const payload = { id: createdUser.id };
    return this.createToken(createdUser, payload);
  }

  async createToken(
    user: Users,
    payload: { id: number },
  ): Promise<LoginResponseDto> {
    const response = new LoginResponseDto();
    response.access_token = this.jwtService.sign(payload);
    response.refresh_token = await this.generateRefreshToken();
    const expiresAt = parseInt(process.env.JWT_EXPIRES_IN || '3600', 10);

    const expiresAtDate = DateTime.now()
      .plus({ seconds: expiresAt })
      .toJSDate();
    response.expires_at = expiresAtDate;

    const expiresRefreshAt = parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN || '86400',
      10,
    );
    const expiresRefreshAtDate = DateTime.now()
      .plus({ seconds: expiresRefreshAt })
      .toJSDate();
    response.expires_refresh_at = expiresRefreshAtDate;

    const sessionToken = new SessionToken();
    sessionToken.user = user;
    sessionToken.access_token = response.access_token;
    sessionToken.expires_at = response.expires_at;
    sessionToken.refresh_token = response.refresh_token;
    sessionToken.expires_refresh_at = response.expires_refresh_at;
    await this.sessionTokenRepository.save(sessionToken);

    return response;
  }

  async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  async validateAccessToken(accessToken: string): Promise<Users> {
    try {
      const payload = this.jwtService.verify(accessToken);
      const token = await this.sessionTokenRepository.findOne({
        where: {
          access_token: accessToken,
          expires_at: MoreThan(DateTime.now().toJSDate()),
        },
        relations: ['user'],
      });
      if (!token || token.user.id !== payload.id) {
        throw new UnauthorizedException('Invalid access token');
      }
      return token.user;
    } catch (e) {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
