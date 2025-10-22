import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { PaginatorResponse } from '../common/dto/paginator.response.dto';
import { DtoMapper } from '../utils';
import { GetAllUsersDto } from './dto/get-all-user.dto';
import { MeResponseDto } from './dto/me.response.dto';
import { Users } from './entities/users.entity';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10; // Defined as a constant value

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async getUserByUsername(username: string): Promise<Users> {
    return await this.usersRepository.findOne({
      where: { username },
      relations: ['session_tokens'],
    });
  }

  async validateUserCredentials(loginDto: LoginDto): Promise<Users | null> {
    const user: Users = await this.usersRepository.findOne({
      where: { username: loginDto.username },
    });

    if (!user) {
      return null;
    }

    try {
      // bcrypt.compare function automatically extracts salt from hash and compares
      const isPasswordValid: boolean = await bcrypt.compare(loginDto.password, user.password);

      return isPasswordValid ? user : null;
    } catch {
      throw new BadRequestException('Password verification failed');
    }
  }

  async getPaginatedUsers(input: GetAllUsersDto): Promise<PaginatorResponse<MeResponseDto>> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.session_tokens', 'session_tokens')
      .orderBy('users.created_at', 'DESC')
      .skip(input.limit * (input.page - 1))
      .take(input.limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const nodes = DtoMapper.toDtos(data, MeResponseDto);
    const pageSize = Math.min(input.limit, total);

    return {
      nodes,
      current_page: input.page,
      page_size: pageSize,
      has_next: total > input.page * input.limit,
      total_pages: Math.ceil(total / input.limit),
      total_count: total,
    };
  }

  async createUser(registerDto: RegisterDto): Promise<Users> {
    try {
      // bcrypt.hash function automatically generates salt and combines it with hash
      const hashedPassword: string = await bcrypt.hash(registerDto.password, this.SALT_ROUNDS);

      const user: Users = this.usersRepository.create({
        username: registerDto.username,
        password: hashedPassword,
      });

      return await this.usersRepository.save(user);
    } catch {
      throw new BadRequestException('An error occurred while creating the user');
    }
  }
}
