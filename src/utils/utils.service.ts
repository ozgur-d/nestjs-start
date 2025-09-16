import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { DataSource, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { PaginatorResponse } from './dto/paginator.response.dto';

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

    const nodes = this.mapToDtos(data, responseDto);
    const pageSize = Math.min(limit, total);

    return {
      nodes,
      current_page: page,
      page_size: pageSize,
      has_next: total > page * limit,
      total_pages: Math.ceil(total / limit),
      total_count: total,
    };
  }

  /* public async mapToDto<T>(source: object | object[], dto: new () => T): Promise<T | T[]> {
    const mapSingle = async (item: object): Promise<T> => {
      const plain = instanceToPlain(item);
      const errors = await validate(item);

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
      }

      return plainToInstance(dto, plain, { excludeExtraneousValues: true });
    };

    return Array.isArray(source) ? Promise.all(source.map(mapSingle)) : mapSingle(source);
  } */

  public mapToDto<V, T>(obj: V, Dto: ClassConstructor<T>): T {
    return plainToInstance(Dto, obj as object, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  public mapToDtos<V, T>(arr: V[], Dto: ClassConstructor<T>): T[] {
    return arr.map((v) => this.mapToDto(v, Dto));
  }
}
