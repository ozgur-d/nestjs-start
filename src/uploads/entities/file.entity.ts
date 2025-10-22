import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { FileTypeEnum } from '../enums/file-type.enum';
import { StorageTypeEnum } from '../enums/storage-type.enum';

@Entity('files')
export class Files {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  original_name: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  file_name: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'integer' })
  size: number;

  @Index()
  @Column({
    name: 'storage_type',
    type: 'enum',
    enum: StorageTypeEnum,
  })
  storage_type: StorageTypeEnum;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'integer', nullable: true })
  width?: number;

  @Column({ type: 'integer', nullable: true })
  height?: number;

  @Index()
  @Column({
    name: 'file_type',
    type: 'enum',
    enum: FileTypeEnum,
    nullable: true,
  })
  file_type?: FileTypeEnum;

  @Column({ name: 'has_thumbnails', type: 'boolean', default: false })
  has_thumbnails: boolean;

  @Index()
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by?: Users;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
