import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Files } from './entities/file.entity';
import { FileValidatorService } from './services/file-validator.service';
import { LocalStorageProvider } from './services/storage/local-storage.provider';
import { S3StorageProvider } from './services/storage/s3-storage.provider';
import { ThumbnailService } from './services/thumbnail.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Files])],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    FileValidatorService,
    ThumbnailService,
    LocalStorageProvider,
    S3StorageProvider,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
