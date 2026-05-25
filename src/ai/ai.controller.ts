import {
  Body,
  Controller,
  Post,
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
import { memoryStorage } from "multer";

import { AiService } from "./ai.service";
import {
  EvaluateCodeDto,
  EvaluateImageDto,
  EvaluateTextDto,
  GenerateTestDto,
} from "./dto/ai.dto";

@ApiTags("AI")
@ApiBearerAuth("access-token")
@Controller("ai")
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post("generate-test")
  @ApiOperation({ summary: "Mavzu bo‘yicha AI orqali test generatsiya qilish" })
  generateTest(@Body() dto: GenerateTestDto) {
    return this.service.generateTest(dto);
  }

  @Post("evaluate/text")
  @ApiOperation({ summary: "Matnli javobni AI orqali baholash" })
  evaluateText(@Body() dto: EvaluateTextDto) {
    return this.service.evaluateText(dto);
  }

  @Post("evaluate/code")
  @ApiOperation({ summary: "Kod javobini AI orqali baholash" })
  evaluateCode(@Body() dto: EvaluateCodeDto) {
    return this.service.evaluateCode(dto);
  }

  @Post("evaluate/image")
  @ApiOperation({ summary: "Rasmli javobni AI orqali baholash" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: EvaluateImageDto })
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  evaluateImage(
    @Body("question") question: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.evaluateImage(question, file);
  }
}
