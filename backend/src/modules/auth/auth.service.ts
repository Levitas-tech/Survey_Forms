import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: User; tokens: any }> {
    const { email, password, name, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      role: role || UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword as User,
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; tokens: any }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ tokens: any }> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return { tokens };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Save refresh token to database
    await this.userRepository.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
    };
  }

  async getUserStats(user: User): Promise<{ totalUsers: number; activeUsers: number; adminUsers: number }> {
    // Check if user is admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }

    // Get total user count
    const totalUsers = await this.userRepository.count();

    // Get active users (users with isActive = true)
    const activeUsers = await this.userRepository.count({
      where: { isActive: true }
    });

    // Get admin users count
    const adminUsers = await this.userRepository.count({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.SUPER_ADMIN }
      ]
    });

    return {
      totalUsers,
      activeUsers,
      adminUsers
    };
  }
}
