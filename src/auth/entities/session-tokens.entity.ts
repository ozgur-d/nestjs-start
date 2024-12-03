import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Entity('session_tokens')
export class SessionTokens {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 500 })
  access_token: string;

  @Column()
  expires_at: Date;

  @Column()
  refresh_token: string;

  @Column()
  expires_refresh_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  //one to many user
  @ManyToOne(() => Users, (user) => user.session_tokens, {
    onDelete: 'CASCADE',
  })
  user: Users;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ip_address: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  user_agent: string;

  @Column({ name: 'is_proxy', default: false })
  is_proxy: boolean;

  @Column({ name: 'original_ip_address', length: 45, nullable: true })
  original_ip_address: string;
}
