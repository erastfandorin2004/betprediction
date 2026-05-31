import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  // Temporary in-memory store — replaced by Drizzle + PostgreSQL in Step 2
  private readonly users = new Map<string, StoredUser>();
  private readonly usersByEmail = new Map<string, StoredUser>();
  private readonly refreshTokens = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (this.usersByEmail.has(dto.email)) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user: StoredUser = {
      id: randomUUID(),
      email: dto.email,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = this.usersByEmail.get(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(token: string): Promise<TokenPair> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
      }) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const stored = this.refreshTokens.get(payload.sub);
    if (stored !== token) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const user = this.users.get(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { user: _u, ...tokens } = this.issueTokens(user);
    return tokens;
  }

  logout(userId: string): void {
    this.refreshTokens.delete(userId);
  }

  private issueTokens(user: StoredUser): AuthResponse {
    const base = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(
      { ...base, type: 'access' },
      { expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d' },
    );

    this.refreshTokens.set(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
