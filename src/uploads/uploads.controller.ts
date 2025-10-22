import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/lib/current-user';
import { Roles } from '../auth/lib/roles.decorator';
import { ResponseDto } from '../common/dto/response.dto';
import { Role } from '../common/enums/role.enum';
import { Users } from '../users/entities/users.entity';
import { UploadFile } from './decorators/upload-file.decorator';
import { UploadFiles } from './decorators/upload-files.decorator';
import { UploadedFile } from './decorators/uploaded-file.decorator';
import { UploadedFiles } from './decorators/uploaded-files.decorator';
import { FileQueryDto } from './dto/file-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { FileTypeEnum } from './enums/file-type.enum';
import type { MultipartFile } from './interfaces/multipart-file.interface';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles(Role.Admin)
  @Post()
  @UploadFile('file')
  @ApiOperation({
    summary: Role.Admin,
    description: 'Upload a single file',
  })
  async uploadFile(
    @UploadedFile() file: MultipartFile,
    @CurrentUser() currentUser: Users,
  ): Promise<ResponseDto<UploadResponseDto>> {
    // Configure upload options with hard-coded values
    const uploadOptions = new UploadFileDto();
    uploadOptions.field_name = 'file';
    uploadOptions.file_type = FileTypeEnum.Image;
    uploadOptions.max_size = 5120; // 5MB
    uploadOptions.max_resolution_width = 2048;
    uploadOptions.max_resolution_height = 2048;
    uploadOptions.min_resolution_width = 100;
    uploadOptions.min_resolution_height = 100;
    uploadOptions.return_dimensions = true;
    uploadOptions.generate_thumbnails = true;

    const result = await this.uploadsService.uploadFile(file, uploadOptions, currentUser);
    return new ResponseDto(result, 'File uploaded successfully');
  }

  @Roles(Role.Admin)
  @Post('multiple')
  @UploadFiles('files', 10)
  @ApiOperation({
    summary: Role.Admin,
    description: 'Upload multiple files',
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: MultipartFile[],
    @CurrentUser() currentUser: Users,
  ): Promise<ResponseDto<UploadResponseDto[]>> {
    // Configure upload options with hard-coded values
    const uploadOptions = new UploadFileDto();
    uploadOptions.field_name = 'files';
    uploadOptions.file_type = FileTypeEnum.Image;
    uploadOptions.max_size = 5120; // 5MB
    uploadOptions.max_resolution_width = 2048;
    uploadOptions.max_resolution_height = 2048;
    uploadOptions.min_resolution_width = 100;
    uploadOptions.min_resolution_height = 100;
    uploadOptions.max_files = 10;
    uploadOptions.return_dimensions = true;
    uploadOptions.generate_thumbnails = true;

    const result = await this.uploadsService.uploadMultipleFiles(files, uploadOptions, currentUser);

    return new ResponseDto(result, 'Files uploaded successfully');
  }

  @Roles(Role.Admin)
  @Get()
  @ApiOperation({
    summary: Role.Admin,
    description: 'List files with pagination',
  })
  async listFiles(
    @Query() queryDto: FileQueryDto,
    @CurrentUser() currentUser: Users,
  ): Promise<ResponseDto> {
    const result = await this.uploadsService.listFiles(queryDto, currentUser);
    return new ResponseDto(result);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  @ApiOperation({
    summary: Role.Admin,
    description: 'Delete a file',
  })
  async deleteFile(
    @Param('id', ParseUUIDPipe) fileId: string,
    @CurrentUser() currentUser: Users,
  ): Promise<ResponseDto<void>> {
    await this.uploadsService.deleteFile(fileId, currentUser);
    return new ResponseDto(null, 'File deleted successfully');
  }
}
