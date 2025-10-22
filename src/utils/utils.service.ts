import { ClassConstructor, plainToInstance } from 'class-transformer';
import slugifyLib from 'slugify';

export class DtoMapper {
  static toDto<V, T>(obj: V, Dto: ClassConstructor<T>): T {
    return plainToInstance(Dto, obj as object, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  static toDtos<V, T>(arr: V[], Dto: ClassConstructor<T>): T[] {
    return arr.map((v) => this.toDto(v, Dto));
  }
}

export class StringHelper {
  static generateSlug(text: string): string {
    return slugifyLib(text, {
      lower: true,
      remove: /[*+~.()'"!:@?/]/g,
    });
  }

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}
