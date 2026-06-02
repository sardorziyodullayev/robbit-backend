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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { InternshipService } from "./internship.service";
import {
  CreateInternshipDto,
  UpdateInternshipDto,
} from "./dto/internship.dto";
import {
  ApplyInternshipDto,
  RejectApplicationDto,
} from "./dto/application.dto";
import { ApplicationStatus } from "./internship-application.entity";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";

@ApiTags("Internship")
@ApiBearerAuth("access-token")
@Controller("internships")
export class InternshipController {
  constructor(private readonly service: InternshipService) {}

  // ===== Talaba uchun =====

  @Get()
  @ApiOperation({ summary: "Ochiq amaliyotlar ro‘yxati" })
  listOpen() {
    return this.service.listOpenInternships();
  }

  @Get("applications/me")
  @ApiOperation({ summary: "Mening arizalarim va holatlari" })
  myApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyApplications(user.id);
  }

  @Post(":id/apply")
  @ApiOperation({ summary: "Amaliyotga ariza berish (talaba)" })
  apply(
    @Param("id", ParseIntPipe) internshipId: number,
    @Body() dto: ApplyInternshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.apply(internshipId, user.id, dto.motivation ?? null);
  }

  // ===== Admin / Mentor: arizalarni boshqarish =====

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get("applications")
  @ApiOperation({ summary: "Arizalar ro‘yxati (admin/mentor)" })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "APPROVED", "REJECTED"] })
  @ApiQuery({ name: "internshipId", required: false, type: Number })
  listApplications(
    @Query("status") status?: ApplicationStatus,
    @Query("internshipId") internshipId?: string,
  ) {
    return this.service.listApplications(
      status,
      internshipId ? Number(internshipId) : undefined,
    );
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch("applications/:appId/approve")
  @ApiOperation({ summary: "Arizani tasdiqlash (admin/mentor)" })
  approve(
    @Param("appId", ParseIntPipe) appId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.approve(appId, actor.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch("applications/:appId/reject")
  @ApiOperation({ summary: "Arizani rad etish (admin/mentor)" })
  reject(
    @Param("appId", ParseIntPipe) appId: number,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.reject(appId, actor.id, dto.reason ?? null);
  }

  // ===== Admin / Mentor: amaliyot CRUD =====

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get("manage/all")
  @ApiOperation({ summary: "Barcha amaliyotlar (admin/mentor)" })
  listAll() {
    return this.service.listInternships();
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post()
  @ApiOperation({ summary: "Amaliyot yaratish (admin/mentor)" })
  create(@Body() dto: CreateInternshipDto) {
    return this.service.createInternship(dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Patch(":id")
  @ApiOperation({ summary: "Amaliyotni tahrirlash (admin/mentor)" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInternshipDto,
  ) {
    return this.service.updateInternship(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @HttpCode(204)
  @Delete(":id")
  @ApiOperation({ summary: "Amaliyotni o‘chirish (admin/mentor)" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.removeInternship(id);
  }
}
