import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

/**
 * Decorator for multiple files upload with Fastify
 * Adds Swagger documentation for multipart/form-data multiple files upload
 *
 * @param fieldName - The name of the form field containing the files (default: 'files')
 * @param maxCount - Maximum number of files to accept (default: 10)
 * @returns Combined decorators for multiple files upload handling
 *
 * @example
 * ```typescript
 * @Post('upload-multiple')
 * @UploadFiles('images', 5)
 * async uploadImages(@Body() uploadDto: UploadFileDto) {
 *   // Handle multiple files upload using Fastify's multipart
 * }
 * ```
 */
export function UploadFiles(fieldName: string = 'files', maxCount: number = 10): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Multiple files upload',
      schema: {
        type: 'object',
        required: [fieldName],
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: `Files to upload (max: ${maxCount})`,
          },
        },
      },
    }),
  );
}
