import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";

import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import { JwtPayload, Role } from "../common/interfaces/jwt-payload.interface";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { requireConfig } from "../common/config/require-config";

export interface AuthUserView {
  id: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  branch: { id: string; name: string; address?: string | null } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUserView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (await this.users.findByUsername(dto.username)) {
      throw new BadRequestException("Username band");
    }
    if (await this.users.findByEmail(dto.email)) {
      throw new BadRequestException("Email band");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: "STUDENT",
      branchId: dto.branchId ?? null,
    });
    await this.users.save(user);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByUsername(dto.username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Login yoki parol xato");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Login yoki parol xato");
    return this.issueTokens(user);
  }

  async refresh(userId: string, presentedRefreshToken: string): Promise<AuthTokens> {
    const user = await this.users.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh token noto'g'ri");
    }
    const ok = await bcrypt.compare(presentedRefreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException("Refresh token noto'g'ri");
    const tokens = await this.signTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.save(user);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;
    user.refreshTokenHash = null;
    await this.users.save(user);
  }

  async me(userId: string): Promise<AuthUserView> {
    const user = await this.users.getById(userId);
    return this.toView(user);
  }

  toView(user: User): AuthUserView {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      branch: user.branch
        ? { id: user.branch.id, name: user.branch.name, address: user.branch.address }
        : null,
    };
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const tokens = await this.signTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.save(user);
    return { ...tokens, user: this.toView(user) };
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: requireConfig(this.cfg, "JWT_ACCESS_SECRET"),
      expiresIn: this.cfg.get<string>("JWT_ACCESS_EXPIRES") ?? "15m",
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: requireConfig(this.cfg, "JWT_REFRESH_SECRET"),
      expiresIn: this.cfg.get<string>("JWT_REFRESH_EXPIRES") ?? "7d",
    });
    return { accessToken, refreshToken };
  }
}
