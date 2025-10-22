import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomThrottlerGuard } from 'src/common/guards/throttler-behind-proxy.guard';
import { CurrentUser } from '../auth/lib/current-user';
import { Roles } from '../auth/lib/roles.decorator';
import { ResponseDto } from '../common/dto/response.dto';
import { Role } from '../common/enums/role.enum';
import { UploadFile } from '../uploads/decorators/upload-file.decorator';
import { UploadedFile } from '../uploads/decorators/uploaded-file.decorator';
import { UploadFileDto } from '../uploads/dto/upload-file.dto';
import { FileTypeEnum } from '../uploads/enums/file-type.enum';
import type { MultipartFile } from '../uploads/interfaces/multipart-file.interface';
import { UploadsService } from '../uploads/uploads.service';
import { DtoMapper } from '../utils';
import { GetAllUsersDto } from './dto/get-all-user.dto';
import { MeResponseDto } from './dto/me.response.dto';
import { Users } from './entities/users.entity';
import { UsersService } from './users.service';

@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Roles(Role.Admin, Role.User)
  @Get('me')
  @ApiOperation({
    summary: Role.Admin + ', ' + Role.User,
    description: 'Get current user profile',
  })
  async getProfile(@CurrentUser() user: Users): Promise<ResponseDto> {
    const getUser = await this.usersService.getUserByUsername(user.username);
    const result = DtoMapper.toDto(getUser, MeResponseDto);
    return new ResponseDto(result);
  }

  @UseGuards(CustomThrottlerGuard)
  @Get('all')
  @ApiOperation({
    summary: 'Public',
    description: 'Get all users with pagination',
  })
  async findAll(@Query() input: GetAllUsersDto): Promise<ResponseDto> {
    const result = await this.usersService.getPaginatedUsers(input);
    return new ResponseDto(result);
  }

  @UseGuards(CustomThrottlerGuard)
  @UseInterceptors(CacheInterceptor)
  @Get('cache')
  @ApiOperation({
    summary: 'Public',
    description: 'Cache test endpoint',
  })
  cache(): ResponseDto {
    //use luxon
    const now = new Date();
    //const result = await this.usersService.getPaginatedUsers();
    return new ResponseDto(now);
  }

  @UploadFile('file')
  @ApiOperation({
    summary: Role.Admin + ', ' + Role.User,
    description: 'Upload avatar',
  })
  @Roles(Role.Admin, Role.User)
  @Post('uploadAvatar')
  async uploadAvatar(
    @UploadedFile() file: MultipartFile,
    @CurrentUser() currentUser: Users,
  ): Promise<ResponseDto> {
    // Configure upload options
    const uploadOptions = new UploadFileDto();
    uploadOptions.field_name = 'file';
    uploadOptions.file_type = FileTypeEnum.Image;
    uploadOptions.max_resolution_width = 256;
    uploadOptions.max_resolution_height = 256;
    uploadOptions.return_dimensions = true;

    const result = await this.uploadsService.uploadFile(file, uploadOptions, currentUser);
    return new ResponseDto(result, 'Category icon uploaded successfully');
  }
}
