import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Health-check (uptime ping uchun, public)" })
  check() {
    return { status: "ok" };
  }
}
