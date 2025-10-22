import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FileTypeEnum } from '../enums/file-type.enum';

export class UploadFileDto {
  @ApiProperty({
    description: 'Field name for the uploaded file',
    example: 'file',
  })
  @IsString()
  field_name: string;

  @ApiProperty({
    description: 'Type of file being uploaded',
    enum: FileTypeEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileTypeEnum)
  file_type?: FileTypeEnum;

  @ApiProperty({
    description: 'Maximum file size in KB',
    default: 5120,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_size?: number = 5120;

  @ApiProperty({
    description: 'Maximum image width in pixels',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max_resolution_width?: number;

  @ApiProperty({
    description: 'Maximum image height in pixels',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max_resolution_height?: number;

  @ApiProperty({
    description: 'Minimum image width in pixels',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  min_resolution_width?: number;

  @ApiProperty({
    description: 'Minimum image height in pixels',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  min_resolution_height?: number;

  @ApiProperty({
    description: 'Custom subfolder path for file storage',
    required: false,
  })
  @IsOptional()
  @IsString()
  custom_sub_folder?: string;

  @ApiProperty({
    description: 'Custom file name (without extension)',
    required: false,
  })
  @IsOptional()
  @IsString()
  custom_file_name?: string;

  @ApiProperty({
    description: 'Maximum number of files for multiple upload',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_files?: number = 1;

  @ApiProperty({
    description: 'Return image dimensions in response',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  return_dimensions?: boolean = false;

  @ApiProperty({
    description: 'Generate thumbnails for images',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  generate_thumbnails?: boolean = true;
}
