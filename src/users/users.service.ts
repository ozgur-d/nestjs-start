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
  private readonly SALT_ROUNDS = 10; // Sabit bir değer olarak tanımlıyoruz

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
      // bcrypt.compare fonksiyonu otomatik olarak hash'ten salt'ı çıkarır ve karşılaştırır
      const isPasswordValid: boolean = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      return isPasswordValid ? user : null;
    } catch (err) {
      throw new BadRequestException('Şifre doğrulama işlemi başarısız');
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
      // bcrypt.hash fonksiyonu otomatik olarak salt üretir ve hash ile birleştirir
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
      throw new BadRequestException('Kullanıcı oluşturulurken bir hata oluştu');
    }
  }

  // Example purpose - should be removed if not used
  async executeBeforeUpdate(): Promise<void> {
    console.log('user before update service');
  }
}
