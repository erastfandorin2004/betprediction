import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

type DbUser = typeof schema.users.$inferSelect;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  // Refresh tokens stored in memory — moved to DB in Step 6 (session management)
  private readonly refreshTokens = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const [existing] = await this.db.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);

    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db.db
      .insert(schema.users)
      .values({ email: dto.email, passwordHash, role: 'user' })
      .returning();

    if (!user) throw new InternalServerErrorException('Failed to create user');

    // Create free subscription record
    await this.db.db
      .insert(schema.subscriptions)
      .values({ userId: user.id, tier: 'free' })
      .onConflictDoNothing();

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const [user] = await this.db.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);

    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

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

    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const stored = this.refreshTokens.get(payload.sub);
    if (stored !== token) throw new UnauthorizedException('Refresh token revoked');

    const [user] = await this.db.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException('User not found');

    const { user: _u, ...tokens } = this.issueTokens(user);
    return tokens;
  }

  logout(userId: string): void {
    this.refreshTokens.delete(userId);
  }

  private issueTokens(user: DbUser): AuthResponse {
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
