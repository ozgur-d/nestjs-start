import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import sizeOf from 'image-size';
import { Repository } from 'typeorm';
import { PaginatorResponse } from '../common/dto/paginator.response.dto';
import { Users } from '../users/entities/users.entity';
import { FileQueryDto } from './dto/file-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { Files } from './entities/file.entity';
import { StorageTypeEnum } from './enums/storage-type.enum';
import { FileMetadata } from './interfaces/file-metadata.interface';
import { MultipartFile } from './interfaces/multipart-file.interface';
import { FileValidatorService } from './services/file-validator.service';
import { LocalStorageProvider } from './services/storage/local-storage.provider';
import { S3StorageProvider } from './services/storage/s3-storage.provider';
import { IStorageProvider, UploadResult } from './services/storage/storage.interface';
import { ThumbnailService } from './services/thumbnail.service';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Files)
    private readonly filesRepository: Repository<Files>,
    private readonly fileValidatorService: FileValidatorService,
    private readonly thumbnailService: ThumbnailService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Determines which storage provider to use based on AWS_S3_ENABLED config
   * @returns Storage provider instance (S3 or Local)
   */
  private getStorageProvider(): IStorageProvider {
    const isS3Enabled = this.configService.get('AWS_S3_ENABLED') === 'true';
    return isS3Enabled ? this.s3StorageProvider : this.localStorageProvider;
  }

  /**
   * Gets storage provider by storage type enum
   * @param storageType Storage type enum value
   * @returns Storage provider instance
   */
  private getStorageByType(storageType: StorageTypeEnum): IStorageProvider {
    return storageType === StorageTypeEnum.S3 ? this.s3StorageProvider : this.localStorageProvider;
  }

  /**
   * Extracts file metadata from multipart file
   * @param file Multipart file object
   * @param buffer File buffer (for size calculation)
   * @returns File metadata object
   */
  private extractMetadata(file: MultipartFile, buffer: Buffer): FileMetadata {
    const fileExtension = file.filename.split('.').pop()?.toLowerCase() || '';

    return {
      original_name: file.filename,
      mime_type: file.mimetype,
      size: buffer.length,
      extension: fileExtension,
    };
  }

  /**
   * Determines if thumbnails should be generated for the file
   * @param uploadOptions Upload configuration options
   * @param fileMetadata File metadata
   * @returns True if thumbnails should be generated
   */
  private shouldGenerateThumbnails(
    uploadOptions: UploadFileDto,
    fileMetadata: FileMetadata,
  ): boolean {
    const isImage = fileMetadata.mime_type.startsWith('image/');

    return isImage && uploadOptions.generate_thumbnails !== false;
  }

  /**
   * Saves file information to database
   * @param uploadResult Upload result from storage provider
   * @param fileMetadata File metadata
   * @param uploadOptions Upload configuration options
   * @param currentUser Current authenticated user
   * @param hasThumbnails Whether thumbnails were generated
   * @param dimensions Image dimensions (if applicable)
   * @returns Saved file entity
   */
  private async saveToDatabase(
    uploadResult: UploadResult,
    fileMetadata: FileMetadata,
    uploadOptions: UploadFileDto,
    currentUser?: Users,
    hasThumbnails: boolean = false,
    dimensions?: { width: number; height: number },
  ): Promise<Files> {
    const fileEntity = this.filesRepository.create({
      original_name: fileMetadata.original_name,
      file_name: uploadResult.file_name,
      mime_type: fileMetadata.mime_type,
      size: fileMetadata.size,
      storage_type:
        this.getStorageProvider() === this.s3StorageProvider
          ? StorageTypeEnum.S3
          : StorageTypeEnum.Local,
      path: uploadResult.path,
      url: uploadResult.url,
      file_type: uploadOptions.file_type,
      has_thumbnails: hasThumbnails,
      uploaded_by: currentUser,
      width: dimensions?.width,
      height: dimensions?.height,
    });

    return await this.filesRepository.save(fileEntity);
  }

  /**
   * Maps file entity to response DTO
   * @param fileEntity File entity from database
   * @param uploadOptions Upload configuration options
   * @returns Upload response DTO
   */
  private mapToResponse(fileEntity: Files, uploadOptions: UploadFileDto): UploadResponseDto {
    const response = new UploadResponseDto();
    response.file_name = fileEntity.url;

    if (uploadOptions.return_dimensions && fileEntity.width && fileEntity.height) {
      response.width = fileEntity.width;
      response.height = fileEntity.height;
    }

    return response;
  }

  /**
   * Uploads a single file
   * @param file Multipart file object
   * @param uploadOptions Upload configuration options
   * @param currentUser Current authenticated user
   * @returns Upload response DTO
   * @throws UnprocessableEntityException if validation fails
   */
  async uploadFile(
    file: MultipartFile,
    uploadOptions: UploadFileDto,
    currentUser?: Users,
  ): Promise<UploadResponseDto> {
    try {
      // Convert file to buffer - Fastify multipart file handling
      let fileBuffer: Buffer;

      // Check if buffer was already extracted (from multiple file upload)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((file as any).buffer) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        fileBuffer = (file as any).buffer;
      } else if (typeof file.toBuffer === 'function') {
        fileBuffer = await file.toBuffer();
      } else if (file.file) {
        // Fastify multipart file has a 'file' property that's a stream
        const chunks: Buffer[] = [];
        for await (const chunk of file.file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
      } else {
        throw new Error('Unable to extract file buffer from multipart file');
      }

      // Validate file
      this.fileValidatorService.validate(fileBuffer, file, uploadOptions);

      // Extract metadata
      const fileMetadata = this.extractMetadata(file, fileBuffer);

      // Upload to storage
      const storageProvider = this.getStorageProvider();
      const uploadResult = await storageProvider.upload(fileBuffer, fileMetadata, {
        custom_sub_folder: uploadOptions.custom_sub_folder,
        custom_file_name: uploadOptions.custom_file_name,
      });

      // Get image dimensions if it's an image
      let dimensions: { width: number; height: number } | undefined;
      if (fileMetadata.mime_type.startsWith('image/')) {
        try {
          const imageDimensions = sizeOf(fileBuffer);
          if (imageDimensions.width && imageDimensions.height) {
            dimensions = {
              width: imageDimensions.width,
              height: imageDimensions.height,
            };
          }
        } catch (error) {
          // Ignore dimension extraction errors for non-standard images
          console.warn('Failed to extract image dimensions:', error);
        }
      }

      // Generate thumbnails if needed
      let hasThumbnails = false;
      if (this.shouldGenerateThumbnails(uploadOptions, fileMetadata)) {
        try {
          await this.thumbnailService.generate(
            fileBuffer,
            uploadResult,
            fileMetadata,
            storageProvider,
          );
          hasThumbnails = true;
        } catch (error) {
          // Log error but don't fail the upload
          console.error('Failed to generate thumbnails:', error);
        }
      }

      // Save to database
      const fileEntity = await this.saveToDatabase(
        uploadResult,
        fileMetadata,
        uploadOptions,
        currentUser,
        hasThumbnails,
        dimensions,
      );

      return this.mapToResponse(fileEntity, uploadOptions);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      throw new UnprocessableEntityException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Uploads multiple files
   * @param files Array of multipart file objects
   * @param uploadOptions Upload configuration options
   * @param currentUser Current authenticated user
   * @returns Array of upload response DTOs
   */
  async uploadMultipleFiles(
    files: MultipartFile[],
    uploadOptions: UploadFileDto,
    currentUser?: Users,
  ): Promise<UploadResponseDto[]> {
    const uploadResults: UploadResponseDto[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, uploadOptions, currentUser);
      uploadResults.push(result);
    }

    return uploadResults;
  }

  /**
   * Deletes a file from storage and database
   * @param fileId File UUID
   * @param currentUser Current authenticated user (optional for authorization)
   * @throws NotFoundException if file not found
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteFile(fileId: string, currentUser?: Users): Promise<void> {
    // Find file in database
    const fileEntity = await this.filesRepository.findOne({
      where: { id: fileId },
      relations: ['uploaded_by'],
    });

    if (!fileEntity) {
      throw new NotFoundException('File not found');
    }

    // Optional: Authorization check - uncomment if needed
    // if (currentUser && fileEntity.uploaded_by?.id !== currentUser.id) {
    //   throw new ForbiddenException('You can only delete your own files');
    // }

    // Get appropriate storage provider
    const storageProvider = this.getStorageByType(fileEntity.storage_type);

    try {
      // Delete main file from storage
      await storageProvider.delete(fileEntity.path);
    } catch (error) {
      // Log error but continue with database cleanup
      console.error('Failed to delete file from storage:', error);
    }

    // Delete thumbnails if they exist
    if (fileEntity.has_thumbnails) {
      try {
        await this.thumbnailService.deleteAll(fileEntity.path, storageProvider);
      } catch (error) {
        // Log error but continue with database cleanup
        console.error('Failed to delete thumbnails:', error);
      }
    }

    // Delete from database
    await this.filesRepository.remove(fileEntity);
  }

  /**
   * Lists files with pagination and filtering
   * @param queryDto Query parameters for filtering and pagination
   * @param currentUser Current authenticated user (optional)
   * @returns Paginated list of files
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listFiles(queryDto: FileQueryDto, currentUser?: Users): Promise<PaginatorResponse<Files>> {
    const queryBuilder = this.filesRepository.createQueryBuilder('file');

    // Filter by user if specified
    if (queryDto.user_id) {
      queryBuilder.andWhere('file.uploaded_by_id = :userId', { userId: queryDto.user_id });
    }

    // Filter by file type if specified
    if (queryDto.file_type) {
      queryBuilder.andWhere('file.file_type = :fileType', { fileType: queryDto.file_type });
    }

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Sorting by creation date (newest first)
    queryBuilder.orderBy('file.created_at', 'DESC');

    // Execute query
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      nodes: items,
      current_page: page,
      page_size: limit,
      has_next: page * limit < total,
      total_pages: Math.ceil(total / limit),
      total_count: total,
    };
  }
}
