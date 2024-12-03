import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Not, Repository } from 'typeorm';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { PaginatorResponse } from '../utils/dto/paginator.response.dto';
import { UtilsService } from '../utils/utils.service';
import { MeResponseDto } from './dto/me.response.dto';
import { Users } from './entities/users.entity';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10; // Defined as a constant value

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @Inject(UtilsService)
    private readonly utilsService: UtilsService,
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
      const isPasswordValid: boolean = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      return isPasswordValid ? user : null;
    } catch (err) {
      throw new BadRequestException('Password verification failed');
    }
  }

  async getPaginatedUsers(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatorResponse<MeResponseDto>> {
    const queryOptions = {
      page,
      limit,
      order: { created_at: 'DESC' as const },
      where: { id: Not(IsNull()) },
      relations: ['session_tokens'],
    };
    return await this.utilsService.getPaginatedData(
      Users,
      queryOptions,
      MeResponseDto,
    );
  }

  async createUser(registerDto: RegisterDto): Promise<Users> {
    try {
      // bcrypt.hash function automatically generates salt and combines it with hash
      const hashedPassword: string = await bcrypt.hash(
        registerDto.password,
        this.SALT_ROUNDS,
      );

      const user: Users = this.usersRepository.create({
        username: registerDto.username,
        password: hashedPassword,
      });

      return await this.usersRepository.save(user);
    } catch (err) {
      throw new BadRequestException(
        'An error occurred while creating the user',
      );
    }
  }

  // Example purpose - should be removed if not used
  async executeBeforeUpdate(): Promise<void> {
    console.log('user before update service');
  }
}
