import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Authentication')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, reply, request);
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.register(registerDto, reply, request);
  }

  @Post('refresh-token')
  async refreshToken(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    let refreshToken = request.cookies['refresh_token'];

    if (!refreshToken) {
      refreshToken = request.headers['refresh-token'] as string;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const accessToken = request.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }

    return this.authService.refreshAccessToken(
      refreshToken,
      accessToken,
      reply,
      request,
    );
  }
}
