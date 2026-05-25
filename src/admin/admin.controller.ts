import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminService } from "./admin.service";
import {
  AdminUserListDto,
  ChangeRoleDto,
  CreateBranchDto,
  ResetPasswordDto,
  UpdateBranchDto,
} from "./dto/admin.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";

@ApiTags("Admin")
@ApiBearerAuth("access-token")
@Controller("admin")
@UseGuards(RolesGuard)
@Roles("SUPER_ADMIN")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("users")
  @ApiOperation({ summary: "Barcha foydalanuvchilar ro‘yxati (pagination)" })
  users(@Query() query: AdminUserListDto) {
    return this.service.listUsers(query);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Foydalanuvchini ID bo‘yicha olish" })
  user(@Param("id") id: string) {
    return this.service.userById(id);
  }

  @Patch("users/:id/toggle-active")
  @ApiOperation({ summary: "Foydalanuvchini faollashtirish / o‘chirish" })
  toggle(@Param("id") id: string) {
    return this.service.toggleActive(id);
  }

  @HttpCode(204)
  @Patch("users/:id/reset-password")
  @ApiOperation({ summary: "Foydalanuvchi parolini qayta o‘rnatish" })
  async resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    await this.service.resetPassword(id, dto);
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Foydalanuvchi rolini o‘zgartirish" })
  changeRole(@Param("id") id: string, @Body() dto: ChangeRoleDto) {
    return this.service.changeRole(id, dto);
  }

  @Get("stats")
  @ApiOperation({ summary: "Umumiy statistika" })
  stats() {
    return this.service.stats();
  }

  @Get("branches")
  @ApiOperation({ summary: "Barcha filiallar" })
  branches() {
    return this.service.listBranches();
  }

  @Get("branches/:id")
  @ApiOperation({ summary: "Filialni ID bo‘yicha olish" })
  branch(@Param("id") id: string) {
    return this.service.branchById(id);
  }

  @Post("branches")
  @ApiOperation({ summary: "Yangi filial yaratish" })
  createBranch(@Body() dto: CreateBranchDto) {
    return this.service.createBranch(dto);
  }

  @Patch("branches/:id")
  @ApiOperation({ summary: "Filial ma’lumotlarini yangilash" })
  updateBranch(@Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.service.updateBranch(id, dto);
  }

  @HttpCode(204)
  @Delete("branches/:id")
  @ApiOperation({ summary: "Filialni o‘chirish" })
  async deleteBranch(@Param("id") id: string) {
    await this.service.deleteBranch(id);
  }
}
