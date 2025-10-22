import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';
import type { ClientInfo as IClientInfo } from './interfaces/client-info.interface';
import { ClientInfo } from './lib/client-info.decorator';

@Controller('auth')
@ApiTags('Authentication')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Public',
    description:
      'User login - Authenticates user and returns access token with refresh token in response body',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: LoginResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @ClientInfo() clientInfo: IClientInfo,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, clientInfo);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Public',
    description:
      'User registration - Registers new user and returns access token with refresh token in response body',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered',
    type: LoginResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @ClientInfo() clientInfo: IClientInfo,
  ): Promise<LoginResponseDto> {
    return this.authService.register(registerDto, clientInfo);
  }

  @Post('refresh-token')
  @ApiOperation({
    summary: 'Public',
    description:
      'Refresh access token using refresh token. Validates user-agent and IP address for security.',
  })
  @ApiHeader({
    name: 'refresh-token',
    description: 'Refresh token obtained from login/register response',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully refreshed tokens',
    type: LoginResponseDto,
  })
  async refreshToken(
    @Req() request: FastifyRequest,
    @ClientInfo() clientInfo: IClientInfo,
  ): Promise<LoginResponseDto> {
    const refreshToken = request.headers['refresh-token'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in headers');
    }

    return this.authService.refreshAccessToken(refreshToken, clientInfo);
  }
}
