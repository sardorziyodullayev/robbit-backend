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
  Query,
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
import { memoryStorage } from "multer";

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
    return this.service.byCourse(courseId, user);
  }

  @Get("course/:courseId/progress")
  @ApiOperation({ summary: "Kurs bo‘yicha foydalanuvchi progressi" })
  courseProgress(
    @Param("courseId", ParseIntPipe) courseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.courseProgress(courseId, user);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get("admin/all")
  @ApiOperation({ summary: "Admin/mentor uchun barcha darslar (kurs nomi bilan)" })
  listAdmin(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.service.listAdmin(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Darsni ID bo‘yicha olish" })
  getOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getOne(id, user);
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
    await this.service.markCompleted(id, user);
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
      storage: memoryStorage(),
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
