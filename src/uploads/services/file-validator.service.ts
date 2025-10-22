import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import sizeOf from 'image-size';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileTypeEnum } from '../enums/file-type.enum';

interface MultipartFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  encoding: string;
}

@Injectable()
export class FileValidatorService {
  /**
   * Validates uploaded file against provided options
   * @param buffer File buffer
   * @param file Multipart file metadata
   * @param uploadOptions Upload configuration options
   * @throws UnprocessableEntityException if validation fails
   */
  validate(buffer: Buffer, file: MultipartFile, uploadOptions: UploadFileDto): void {
    // Check field name
    if (file.fieldname !== uploadOptions.field_name) {
      throw new UnprocessableEntityException(
        `Invalid field name. Expected "${uploadOptions.field_name}", received "${file.fieldname}"`,
      );
    }

    // Check file size
    const fileSizeKB = buffer.length / 1024;
    if (fileSizeKB > uploadOptions.max_size) {
      throw new UnprocessableEntityException(
        `File size is not allowed: Should be less than ${uploadOptions.max_size} KB`,
      );
    }

    // Check file extension if file type is specified
    const fileExtension = this.getExtension(file.filename);
    if (uploadOptions.file_type) {
      this.validateExtension(fileExtension, uploadOptions.file_type);
    }

    // Check image resolution if applicable
    if (this.isImage(file.mimetype)) {
      this.validateImageResolution(buffer, uploadOptions);
    }
  }

  /**
   * Validates file extension against allowed extensions for file type
   * @param extension File extension
   * @param fileType File type enum
   * @throws UnprocessableEntityException if extension not allowed
   */
  private validateExtension(extension: string, fileType: FileTypeEnum): void {
    const allowedExtensions = this.getAllowedExtensions(fileType);
    if (!allowedExtensions.includes(extension)) {
      throw new UnprocessableEntityException(
        `File extension is not allowed. Should be ${allowedExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Validates image resolution against min/max constraints
   * @param buffer Image buffer
   * @param uploadOptions Upload configuration options
   * @throws UnprocessableEntityException if resolution constraints not met
   */
  private validateImageResolution(buffer: Buffer, uploadOptions: UploadFileDto): void {
    try {
      const imageDimensions = sizeOf(buffer);

      if (!imageDimensions.width || !imageDimensions.height) {
        throw new UnprocessableEntityException('Unable to determine image dimensions');
      }

      // Check maximum width
      if (
        uploadOptions.max_resolution_width &&
        imageDimensions.width > uploadOptions.max_resolution_width
      ) {
        throw new UnprocessableEntityException(
          `File resolution is not allowed: Width should be less than ${uploadOptions.max_resolution_width}px`,
        );
      }

      // Check maximum height
      if (
        uploadOptions.max_resolution_height &&
        imageDimensions.height > uploadOptions.max_resolution_height
      ) {
        throw new UnprocessableEntityException(
          `File resolution is not allowed: Height should be less than ${uploadOptions.max_resolution_height}px`,
        );
      }

      // Check minimum width
      if (
        uploadOptions.min_resolution_width &&
        imageDimensions.width < uploadOptions.min_resolution_width
      ) {
        throw new UnprocessableEntityException(
          `File resolution is not allowed: Width should be at least ${uploadOptions.min_resolution_width}px`,
        );
      }

      // Check minimum height
      if (
        uploadOptions.min_resolution_height &&
        imageDimensions.height < uploadOptions.min_resolution_height
      ) {
        throw new UnprocessableEntityException(
          `File resolution is not allowed: Height should be at least ${uploadOptions.min_resolution_height}px`,
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      throw new UnprocessableEntityException('Invalid image file or unable to read dimensions');
    }
  }

  /**
   * Gets allowed file extensions for a given file type
   * @param fileType File type enum
   * @returns Array of allowed extensions
   */
  getAllowedExtensions(fileType: FileTypeEnum): string[] {
    const extensionMap: Record<FileTypeEnum, string[]> = {
      [FileTypeEnum.Image]: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
      [FileTypeEnum.Video]: ['mp4', 'webm', 'mov'],
      [FileTypeEnum.Podcast]: ['mp3', 'wav', 'ogg'],
      [FileTypeEnum.Pdf]: ['pdf'],
      [FileTypeEnum.Excel]: ['xls', 'xlsx', 'csv'],
      [FileTypeEnum.EBook]: ['pdf', 'epub', 'mobi', 'azw', 'azw3'],
    };

    return extensionMap[fileType] || [];
  }

  /**
   * Extracts file extension from filename
   * @param fileName File name
   * @returns Lowercase file extension
   */
  private getExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Checks if MIME type is an image
   * @param mimeType MIME type string
   * @returns True if image MIME type
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
}
