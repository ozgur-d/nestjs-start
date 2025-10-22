import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sizeOf from 'image-size';
import sharp from 'sharp';
import { FileMetadata } from '../interfaces/file-metadata.interface';
import { UploadOptions } from '../interfaces/upload-options.interface';
import { IStorageProvider } from './storage/storage.interface';

interface UploadResult {
  path: string;
  url: string;
  file_name: string;
}

@Injectable()
export class ThumbnailService {
  private readonly THUMBNAIL_SIZES = [128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

  constructor(private readonly configService: ConfigService) {}

  async generate(
    buffer: Buffer,
    uploadResult: UploadResult,
    fileMetadata: FileMetadata,
    storageProvider: IStorageProvider,
  ): Promise<void> {
    // Skip SVG files
    if (fileMetadata.mime_type === 'image/svg+xml') {
      return;
    }

    // Get original image dimensions
    const imageDimensions = sizeOf(buffer);
    const originalWidth = imageDimensions.width || 0;

    for (const thumbnailSize of this.THUMBNAIL_SIZES) {
      // Skip sizes larger than original image
      if (originalWidth <= thumbnailSize) {
        continue;
      }

      try {
        // Resize image using sharp
        const resizedBuffer = await sharp(buffer)
          .resize(thumbnailSize, null, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();

        // Prepare thumbnail metadata
        const thumbnailMetadata: FileMetadata = {
          ...fileMetadata,
          original_name: `${thumbnailSize}_${fileMetadata.original_name}`,
        };

        // Prepare upload options with size subfolder
        const thumbnailOptions: UploadOptions = {
          custom_sub_folder: `${thumbnailSize}`,
          custom_file_name: uploadResult.file_name.split('.')[0], // Use same base name
        };

        // Upload thumbnail to storage provider
        await storageProvider.upload(resizedBuffer, thumbnailMetadata, thumbnailOptions);
      } catch (error) {
        // Log error but continue with other sizes
        console.error(`Failed to generate thumbnail size ${thumbnailSize}:`, error);
      }
    }
  }

  async deleteAll(originalPath: string, storageProvider: IStorageProvider): Promise<void> {
    for (const thumbnailSize of this.THUMBNAIL_SIZES) {
      try {
        const thumbnailPath = this.getThumbnailPath(originalPath, thumbnailSize);
        await storageProvider.delete(thumbnailPath);
      } catch (error) {
        // Log but don't fail if thumbnail doesn't exist
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to delete thumbnail at size ${thumbnailSize}:`, errorMessage);
      }
    }
  }

  private getThumbnailPath(originalPath: string, size: number): string {
    const pathParts = originalPath.split('/');
    const fileName = pathParts.pop();
    return [...pathParts, size.toString(), fileName].join('/');
  }
}
