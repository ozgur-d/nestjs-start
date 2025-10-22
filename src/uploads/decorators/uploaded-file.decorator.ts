import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '../interfaces/multipart-file.interface';

/**
 * Parameter decorator to extract a single file from a Fastify multipart request
 * Works alongside @UploadFile() method decorator for Swagger documentation
 *
 * @param fieldName - Optional field name for future field-specific validation
 * @returns The uploaded file data
 * @throws BadRequestException if no file is provided
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UploadFile('file')
 * async uploadFile(
 *   @UploadedFile() file: MultipartFile,
 *   @CurrentUser() user: Users
 * ) {
 *   return this.service.uploadFile(file, user);
 * }
 * ```
 */
export const UploadedFile = createParamDecorator(
  async (fieldName: string | undefined, ctx: ExecutionContext): Promise<MultipartFile> => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    const file = await request.file();

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return file as MultipartFile;
  },
);
