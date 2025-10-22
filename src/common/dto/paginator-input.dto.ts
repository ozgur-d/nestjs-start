import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OrderDirectionEnum } from '../enums/order-direction.enum';

export class PaginatorInputDto {
  @ApiProperty({ required: false, default: 1 })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1, { message: 'validation.page_min' })
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1, { message: 'validation.limit_min' })
  @Max(100, { message: 'validation.limit_max' })
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'validation.search_text_min' })
  search_text?: string;

  @ApiProperty({ required: false, default: 'created_at' })
  @IsString()
  @MaxLength(32)
  order_by?: string = 'created_at';

  @ApiProperty({ enum: OrderDirectionEnum, required: false, default: 'DESC' })
  @IsEnum(OrderDirectionEnum)
  order_direction?: OrderDirectionEnum;
}
