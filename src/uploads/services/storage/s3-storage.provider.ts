import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FileMetadata } from '../../interfaces/file-metadata.interface';
import { UploadOptions } from '../../interfaces/upload-options.interface';
import { IStorageProvider, UploadResult } from './storage.interface';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY'),
      },
      region: this.configService.getOrThrow<string>('AWS_REGION'),
    });
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
  }

  async upload(
    buffer: Buffer,
    metadata: FileMetadata,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const generatedFileName = this.generateFileName(metadata, options);
    const uploadFolder = this.configService.getOrThrow<string>('AWS_UPLOAD_FOLDER');
    const subFolder = options.custom_sub_folder || '';
    const s3Key = `${uploadFolder}/${subFolder}/${generatedFileName}`.replace(/\/+/g, '/');

    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: metadata.mime_type,
      ContentDisposition: 'inline',
    });

    await this.s3Client.send(putCommand);

    return {
      path: s3Key,
      url: this.getUrl(s3Key),
      file_name: generatedFileName,
    };
  }

  async delete(filePath: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    await this.s3Client.send(deleteCommand);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      await this.s3Client.send(headCommand);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    const cdnUrl = this.configService.getOrThrow<string>('AWS_CDN_URL');
    return `${cdnUrl}/${filePath}`;
  }

  private generateFileName(metadata: FileMetadata, options: UploadOptions): string {
    if (options.custom_file_name) {
      return `${options.custom_file_name}.${metadata.extension}`;
    }
    return `${randomUUID()}.${metadata.extension}`;
  }
}
