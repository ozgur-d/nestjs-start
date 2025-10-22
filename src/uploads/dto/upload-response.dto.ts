import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'URL or path to the uploaded file',
    example: 'https://cdn.example.com/uploads/abc123.jpg',
  })
  file_name: string;

  @ApiProperty({
    description: 'Image width in pixels',
    required: false,
  })
  width?: number;

  @ApiProperty({
    description: 'Image height in pixels',
    required: false,
  })
  height?: number;
}
