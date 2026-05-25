import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { randomUUID } from "crypto";

import { ProfileService } from "./profile.service";
import {
  ChangePasswordDto,
  TestHistoryQueryDto,
  UpdateProfileDto,
  UploadAvatarDto,
} from "./dto/profile.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";

@ApiTags("Profile")
@ApiBearerAuth("access-token")
@Controller("profile")
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get("me")
  @ApiOperation({ summary: "Joriy foydalanuvchi profili" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.me(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Profilni yangilash" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.update(user.id, dto);
  }

  @HttpCode(204)
  @Patch("me/password")
  @ApiOperation({ summary: "Parolni o‘zgartirish" })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.service.changePassword(user.id, dto);
  }

  @Post("me/avatar")
  @ApiOperation({ summary: "Avatar yuklash" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UploadAvatarDto })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, join(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads")),
        filename: (_req, file, cb) =>
          cb(null, `avatar-${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAvatar(user.id, file);
  }

  @HttpCode(204)
  @Delete("me/avatar")
  @ApiOperation({ summary: "Avatarni o‘chirish" })
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    await this.service.deleteAvatar(user.id);
  }

  @Get("me/test-history")
  @ApiOperation({ summary: "Test urinishlari tarixi" })
  testHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TestHistoryQueryDto,
  ) {
    return this.service.testHistory(user.id, query.page, query.limit);
  }

  @Get("me/certificates")
  @ApiOperation({ summary: "Foydalanuvchi sertifikatlari" })
  certificates(@CurrentUser() user: AuthenticatedUser) {
    return this.service.certificates(user.id);
  }
}
