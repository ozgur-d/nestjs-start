import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates user and returns access token with refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    headers: {
      'Set-Cookie': {
        description: 'HTTP-only cookie containing refresh token',
        schema: {
          type: 'string',
          example: 'refresh_token=xxx; HttpOnly; Secure; SameSite=Strict',
        },
      },
      'refresh-token': {
        description: 'Refresh token (also available in cookie)',
        schema: {
          type: 'string',
        },
      },
      'refresh-token-expires-at': {
        description: 'Expiration timestamp of refresh token',
        schema: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-21T12:00:00.000Z',
        },
      },
    },
    type: LoginResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, reply, request);
  }

  @Post('register')
  @ApiOperation({
    summary: 'User registration',
    description: 'Registers new user and returns access token with refresh token',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered',
    headers: {
      'Set-Cookie': {
        description: 'HTTP-only cookie containing refresh token',
        schema: {
          type: 'string',
          example: 'refresh_token=xxx; HttpOnly; Secure; SameSite=Strict',
        },
      },
      'refresh-token': {
        description: 'Refresh token (also available in cookie)',
        schema: {
          type: 'string',
        },
      },
      'refresh-token-expires-at': {
        description: 'Expiration timestamp of refresh token',
        schema: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-21T12:00:00.000Z',
        },
      },
    },
    type: LoginResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    return this.authService.register(registerDto, reply, request);
  }

  @Post('refresh-token')
  @ApiHeader({
    name: 'refresh-token',
    description:
      'Refresh token for authentication. you must send refresh-token with header or refresh_token with cookie auth. Authorization: Bearer access_token must be sent with header.',
    required: true,
  })
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

    return this.authService.refreshAccessToken(refreshToken, accessToken, reply, request);
  }
}
