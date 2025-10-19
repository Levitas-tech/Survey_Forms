import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(role?: UserRole): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (role) {
      query.where('user.role = :role', { role });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['groups'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, name, role } = createUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      role: role || UserRole.USER,
    });

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(id, { passwordHash });
  }
}
