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

import { CoursesService } from "./courses.service";
import {
  CreateCategoryDto,
  CreateCourseDto,
  UpdateCategoryDto,
  UpdateCourseDto,
} from "./dto/create-course.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ListCoursesDto } from "./dto/list-courses.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("Courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Ommaviy kurslar ro‘yxati" })
  list(@Query() query: ListCoursesDto) {
    return this.service.list(query, false);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get("admin/all")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Admin/mentor uchun barcha kurslar (draft’lar bilan)" })
  listAll(@Query() query: ListCoursesDto) {
    return this.service.list(query, true);
  }

  @Public()
  @Get("categories")
  @ApiOperation({ summary: "Barcha kategoriyalar" })
  categories() {
    return this.service.listCategories();
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post("categories")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Yangi kategoriya yaratish" })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch("categories/:id")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kategoriyani yangilash" })
  updateCategory(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @HttpCode(204)
  @Delete("categories/:id")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kategoriyani o‘chirish" })
  async removeCategory(@Param("id", ParseIntPipe) id: number) {
    await this.service.removeCategory(id);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Kursni ID bo‘yicha olish" })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post()
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Yangi kurs yaratish" })
  create(@Body() dto: CreateCourseDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch(":id")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kursni yangilash" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Delete(":id")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kursni o‘chirish" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch(":id/publish")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kursni publish qilish" })
  publish(@Param("id", ParseIntPipe) id: number) {
    return this.service.setPublish(id, true);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch(":id/unpublish")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kursni unpublish qilish" })
  unpublish(@Param("id", ParseIntPipe) id: number) {
    return this.service.setPublish(id, false);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post(":id/thumbnail")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kurs uchun rasm (thumbnail) yuklash" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.attachThumbnail(id, file);
  }

  @Public()
  @Get(":id/reviews")
  @ApiOperation({ summary: "Kursning reviewlari" })
  reviews(@Param("id", ParseIntPipe) id: number) {
    return this.service.listReviews(id);
  }

  @Post(":id/reviews")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Kursga review qoldirish" })
  addReview(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addReview(id, user.id, dto);
  }
}
