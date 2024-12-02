import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAccessTokenDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Refresh token boş olamaz' })
  @IsString({ message: 'Refresh token string olmalıdır' })
  refresh_token: string;
}
