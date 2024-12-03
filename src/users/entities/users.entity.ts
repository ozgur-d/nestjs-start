import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SessionTokens } from '../../auth/entities/session-tokens.entity';
import { Role } from '../../common/enums/role.enum';

@Entity()
export class Users {
  @Index()
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Index({ unique: true })
  @Column()
  username: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: Role, default: [Role.User] })
  role: Role;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  //one to many session
  @OneToMany(() => SessionTokens, (sessionToken) => sessionToken.user, {
    cascade: true,
  })
  session_tokens: SessionTokens[];

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  toJSON() {
    return { ...this, password: undefined };
  }
}
