import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/lib/current-user';
import { Roles } from '../auth/lib/roles.decorator';
import { ResponseDto } from '../common/dto/response.dto';
import { Role } from '../common/enums/role.enum';
import { UtilsService } from '../utils/utils.service';
import { MeResponseDto } from './dto/me.response.dto';
import { Users } from './entities/users.entity';
import { UsersService } from './users.service';

@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(UtilsService)
    private readonly utilsService: UtilsService,
  ) {}

  @Roles(Role.Admin, Role.User)
  @Get('me')
  async getProfile(@CurrentUser() user: Users): Promise<ResponseDto> {
    const getUser = await this.usersService.getUserByUsername(user.username);
    const result = await this.utilsService.mapToDto(getUser, MeResponseDto);
    return new ResponseDto(result);
  }

  @Get('all')
  async findAll(): Promise<ResponseDto> {
    const result = await this.usersService.getPaginatedUsers();
    return new ResponseDto(result);
  }
}
