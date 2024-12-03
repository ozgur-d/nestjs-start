import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ResponseDto } from '../common/dto/response.dto';
import { Role } from '../common/enums/role.enum';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './lib/roles.decorator';

@Controller('auth')
@ApiTags('Authentication')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async executeLogin(
    @Body() loginInfo: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ResponseDto> {
    const response = await this.authService.login(loginInfo, reply);
    return new ResponseDto(response);
  }

  @Post('register')
  async executeRegister(
    @Body() registerInfo: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ResponseDto> {
    const response = await this.authService.register(registerInfo, reply);
    return new ResponseDto(response);
  }

  @Roles(Role.User, Role.Admin)
  @Get('logout')
  async executeLogout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ResponseDto> {
    const accessToken = this.extractAccessToken(req);
    await this.authService.logout(accessToken, reply);
    return new ResponseDto(null);
  }

  @ApiCookieAuth()
  @Get('refresh-token')
  async refreshAccessToken(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ResponseDto> {
    const signedCookie = req.cookies[this.authService['COOKIE_NAME']];
    if (!signedCookie) {
      throw new UnauthorizedException('Refresh token bulunamadı');
    }

    // İmzalı cookie'yi doğrula
    const unsignResult = req.unsignCookie(signedCookie);
    if (!unsignResult?.valid) {
      this.authService['clearRefreshTokenCookie'](reply);
      throw new UnauthorizedException('Geçersiz refresh token imzası');
    }

    const response = await this.authService.refreshAccessToken(
      unsignResult.value, // Doğrulanmış orijinal değeri kullan
      reply,
    );
    return new ResponseDto(response, 'Access token yenilendi');
  }

  private extractAccessToken(req: FastifyRequest): string {
    const authorizationHeader =
      req.headers.authorization ?? req.query['access-token'];
    return authorizationHeader.replace('Bearer ', '');
  }
}
