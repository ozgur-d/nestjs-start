import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LoginResponseDto {
  @Expose()
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @Expose()
  @ApiProperty({ description: 'Access token expiration date' })
  expires_at: Date;

  @Expose()
  @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
  refresh_token: string;

  @Expose()
  @ApiProperty({ description: 'Refresh token expiration date' })
  refresh_token_expires_at: Date;
}
