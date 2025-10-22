import { FileMetadata } from '../../interfaces/file-metadata.interface';
import { UploadOptions } from '../../interfaces/upload-options.interface';

export interface UploadResult {
  path: string;
  url: string;
  file_name: string;
}

export interface IStorageProvider {
  upload(buffer: Buffer, metadata: FileMetadata, options: UploadOptions): Promise<UploadResult>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): string;
}
