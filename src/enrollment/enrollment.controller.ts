import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { EnrollmentService } from "./enrollment.service";
import { CreateEnrollmentDto } from "./dto/enrollment.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";

@ApiTags("Enrollment")
@ApiBearerAuth("access-token")
@Controller("enrollments")
export class EnrollmentController {
  constructor(private readonly service: EnrollmentService) {}

  @Get("me")
  @ApiOperation({ summary: "O‘zim yozilgan kurslar ro‘yxati" })
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyCourses(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get("course/:courseId")
  @ApiOperation({ summary: "Kursga yozilgan talabalar (admin/mentor)" })
  byCourse(@Param("courseId", ParseIntPipe) courseId: number) {
    return this.service.listByCourse(courseId);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post()
  @ApiOperation({ summary: "Talabani kursga yozish (admin/mentor)" })
  enroll(
    @Body() dto: CreateEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.enroll(dto.courseId, dto.userId, actor.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @HttpCode(204)
  @Delete("course/:courseId/user/:userId")
  @ApiOperation({ summary: "Talabani kursdan chiqarish (admin/mentor)" })
  async unenroll(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Param("userId") userId: string,
  ) {
    await this.service.unenroll(courseId, userId);
  }
}
