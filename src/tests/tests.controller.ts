import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TestsService } from "./tests.service";
import { CreateTestDto, SubmitTestDto } from "./dto/test.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/interfaces/jwt-payload.interface";

@ApiTags("Tests")
@ApiBearerAuth("access-token")
@Controller("tests")
export class TestsController {
  constructor(private readonly service: TestsService) {}

  @Get("course/:courseId")
  @ApiOperation({ summary: "Kursdagi testlar ro‘yxati" })
  byCourse(@Param("courseId", ParseIntPipe) courseId: number) {
    return this.service.byCourse(courseId);
  }

  @Get("attempts/:id")
  @ApiOperation({ summary: "Test urinishini ID bo‘yicha olish" })
  attempt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getAttempt(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Get(":id/with-answers")
  @ApiOperation({ summary: "Testni to‘g‘ri javoblari bilan olish (admin/mentor)" })
  getOneWithAnswers(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOne(id, true);
  }

  @Get(":id")
  @ApiOperation({ summary: "Testni ID bo‘yicha olish (javoblarsiz)" })
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOne(id, false);
  }

  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "MENTOR")
  @Post()
  @ApiOperation({ summary: "Yangi test yaratish" })
  create(@Body() dto: CreateTestDto) {
    return this.service.create(dto);
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "Test javoblarini yuborish" })
  submit(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SubmitTestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submit(id, user.id, dto);
  }
}
