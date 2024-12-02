import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ResponseDto } from '../common/dto/response.dto';
import { Role } from '../common/enums/role.enum';
import { AuthService } from './auth.service';
import { GetAccessTokenDto } from './dto/get-access-token.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './lib/roles.decorator';

@Controller('auth')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async executeLogin(@Body() loginInfo: LoginDto): Promise<ResponseDto> {
    const response = await this.authService.login(loginInfo);
    return new ResponseDto(response);
  }

  @Post('register')
  async executeRegister(
    @Body() registerInfo: RegisterDto,
  ): Promise<ResponseDto> {
    const response = await this.authService.register(registerInfo);
    return new ResponseDto(response);
  }

  @Roles(Role.User, Role.Admin)
  @Get('logout')
  async executeLogout(@Req() req): Promise<ResponseDto> {
    const accessToken = this.extractAccessToken(req);
    await this.authService.logout(accessToken);
    return new ResponseDto(null);
  }

  @Get('get-access-token')
  async getAccessToken(@Query() dto: GetAccessTokenDto): Promise<ResponseDto> {
    const response = await this.authService.getAccessToken(dto.refresh_token);
    return new ResponseDto(response, 'Access token retrieved');
  }

  private extractAccessToken(req): string {
    const authorizationHeader =
      req.headers.authorization ?? req.query['access-token'];
    return authorizationHeader.replace('Bearer ', '');
  }
}
