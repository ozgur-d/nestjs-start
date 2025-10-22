import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { FileMetadata } from '../../interfaces/file-metadata.interface';
import { UploadOptions } from '../../interfaces/upload-options.interface';
import { IStorageProvider, UploadResult } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async upload(
    buffer: Buffer,
    metadata: FileMetadata,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const uploadPath = this.configService.getOrThrow<string>('UPLOAD_PATH');
    const generatedFileName = this.generateFileName(metadata, options);
    const subFolder = options.custom_sub_folder || '';
    const fullDirectoryPath = path.join(uploadPath, subFolder);

    // Ensure directory exists
    await fs.mkdir(fullDirectoryPath, { recursive: true });

    // Write file
    const fullFilePath = path.join(fullDirectoryPath, generatedFileName);
    await fs.writeFile(fullFilePath, buffer);

    const relativeFilePath = path.join(subFolder, generatedFileName);
    const fileUrl = this.getUrl(relativeFilePath);

    return {
      path: relativeFilePath,
      url: fileUrl,
      file_name: generatedFileName,
    };
  }

  async delete(filePath: string): Promise<void> {
    const uploadPath = this.configService.getOrThrow<string>('UPLOAD_PATH');
    const fullFilePath = path.join(uploadPath, filePath);

    if (await this.exists(filePath)) {
      await fs.unlink(fullFilePath);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const uploadPath = this.configService.getOrThrow<string>('UPLOAD_PATH');
    const fullFilePath = path.join(uploadPath, filePath);

    try {
      await fs.access(fullFilePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    const siteUrl = this.configService.getOrThrow<string>('SITE_URL');
    return `${siteUrl}/uploads/${filePath}`;
  }

  private generateFileName(metadata: FileMetadata, options: UploadOptions): string {
    if (options.custom_file_name) {
      return `${options.custom_file_name}.${metadata.extension}`;
    }
    return `${randomUUID()}.${metadata.extension}`;
  }
}
