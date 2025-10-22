import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '../interfaces/multipart-file.interface';

/**
 * Parameter decorator to extract multiple files from a Fastify multipart request
 * Works alongside @UploadFiles() method decorator for Swagger documentation
 *
 * @param fieldName - Optional field name for future field-specific validation
 * @returns Array of uploaded file data
 * @throws BadRequestException if no files are provided or if stream processing fails
 *
 * @example
 * ```typescript
 * @Post('upload-multiple')
 * @UploadFiles('files', 10)
 * async uploadFiles(
 *   @UploadedFiles() files: MultipartFile[],
 *   @CurrentUser() user: Users
 * ) {
 *   return this.service.uploadMultipleFiles(files, user);
 * }
 * ```
 */
export const UploadedFiles = createParamDecorator(
  async (fieldName: string | undefined, ctx: ExecutionContext): Promise<MultipartFile[]> => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    const files: MultipartFile[] = [];

    try {
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file') {
          // Consume the stream immediately to allow iterator to continue
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk as Buffer);
          }
          const buffer = Buffer.concat(chunks);

          // Add buffer to the part object so we don't need to read stream again
          const fileWithBuffer = part as MultipartFile;
          fileWithBuffer.buffer = buffer;

          files.push(fileWithBuffer);
        }
      }
    } catch {
      throw new BadRequestException('Error processing file parts');
    }

    if (files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return files;
  },
);
