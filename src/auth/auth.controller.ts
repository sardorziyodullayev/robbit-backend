import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";
import { JwtRefreshGuard } from "../common/guards/jwt-refresh.guard";
import { RefreshTokenUser } from "../common/strategies/jwt-refresh.strategy";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Yangi foydalanuvchini ro‘yxatdan o‘tkazish" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  @ApiOperation({ summary: "Username va parol orqali tizimga kirish" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  @Post("refresh")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Refresh token orqali yangi access token olish" })
  refresh(@CurrentUser() user: RefreshTokenUser) {
    return this.auth.refresh(user.id, user.refreshToken);
  }

  @HttpCode(204)
  @Post("logout")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Tizimdan chiqish va refresh tokenni bekor qilish" })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.auth.logout(user.id);
  }

  @Get("me")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Joriy foydalanuvchi ma’lumotlarini olish" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }
}
