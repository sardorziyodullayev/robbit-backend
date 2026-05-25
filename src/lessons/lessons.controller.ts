import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
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

import { LessonsService } from "./lessons.service";
import { CreateLessonDto, UpdateLessonDto } from "./dto/lesson.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";

@ApiTags("Lessons")
@ApiBearerAuth("access-token")
@Controller("lessons")
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Get("course/:courseId")
  @ApiOperation({ summary: "Kurs darslari ro‘yxati" })
  byCourse(
    @Param("courseId", ParseIntPipe) courseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.byCourse(courseId, user.id);
  }

  @Get("course/:courseId/progress")
  @ApiOperation({ summary: "Kurs bo‘yicha foydalanuvchi progressi" })
  courseProgress(
    @Param("courseId", ParseIntPipe) courseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.courseProgress(courseId, user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Darsni ID bo‘yicha olish" })
  getOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getOne(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post()
  @ApiOperation({ summary: "Yangi dars yaratish" })
  create(@Body() dto: CreateLessonDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch(":id")
  @ApiOperation({ summary: "Darsni yangilash" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Delete(":id")
  @ApiOperation({ summary: "Darsni o‘chirish" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
  }

  @HttpCode(204)
  @Post(":id/progress")
  @ApiOperation({ summary: "Darsni tugallandi deb belgilash" })
  async markCompleted(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.markCompleted(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post(":id/video")
  @ApiOperation({ summary: "Darsga video fayl yuklash" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, join(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads")),
        filename: (_req, file, cb) =>
          cb(null, `lesson-${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  uploadVideo(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.attachVideo(id, file);
  }
}
