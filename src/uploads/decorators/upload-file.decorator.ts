import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

/**
 * Decorator for single file upload with Fastify
 * Adds Swagger documentation for multipart/form-data file upload
 *
 * @param fieldName - The name of the form field containing the file (default: 'file')
 * @returns Combined decorators for file upload handling
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UploadFile('avatar')
 * async uploadAvatar(@Body() uploadDto: UploadFileDto) {
 *   // Handle file upload using Fastify's multipart
 * }
 * ```
 */
export function UploadFile(fieldName: string = 'file'): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'File upload',
      schema: {
        type: 'object',
        required: [fieldName],
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
            description: 'File to upload',
          },
        },
      },
    }),
  );
}
