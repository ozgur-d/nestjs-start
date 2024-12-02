import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { PaginatorResponse } from './dto/paginator-response.dto';

interface PaginationOptions<T> {
  page: number;
  limit: number;
  order?: FindOptionsOrder<T>;
  where?: FindOptionsWhere<T>;
  relations?: string[];
}

@Injectable()
export class UtilsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private async executeQuery<T>(
    entity: new () => T,
    options: PaginationOptions<T>,
  ): Promise<{ data: T[]; total: number }> {
    const { page, limit, order, where, relations } = options;
    const repository = this.dataSource.getRepository(entity);
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      skip,
      take: limit,
      order,
      where,
      relations,
    });

    return { data, total };
  }

  async getPaginatedData<ResponseType, EntityType>(
    entity: new () => EntityType,
    options: PaginationOptions<EntityType>,
    responseDto: new () => ResponseType,
  ): Promise<PaginatorResponse<ResponseType>> {
    const { page, limit } = options;
    const { data, total } = await this.executeQuery(entity, options);

    const nodes = (await this.mapToDto(data, responseDto)) as ResponseType[];
    const pageSize = Math.min(limit, total);

    return {
      nodes,
      currentPage: page,
      pageSize,
      hasNext: total > page * limit,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    };
  }

  public async mapToDto<T>(
    source: unknown | unknown[],
    dto: new () => T,
  ): Promise<T | T[]> {
    const mapSingle = async (item: unknown): Promise<T> => {
      const plain = instanceToPlain(item as object);
      const errors = await validate(item as object);

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
      }

      return plainToInstance(dto, plain, { excludeExtraneousValues: true });
    };

    return Array.isArray(source)
      ? Promise.all(source.map(mapSingle))
      : mapSingle(source);
  }
}
