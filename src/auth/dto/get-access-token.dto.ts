import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAccessTokenDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Refresh token cannot be empty' })
  @IsString({ message: 'Refresh token must be a string' })
  refresh_token: string;
}
