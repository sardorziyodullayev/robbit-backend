import { Module } from "@nestjs/common";
import { OpenAiService } from "./openai.service";

/**
 * OpenAiService'ni bir nechta modulga (Ai, Tests) yagona singleton sifatida
 * ulashish uchun alohida modul. Bu AiModule <-> TestsModule o'rtasida aylanma
 * bog'liqlik (circular dependency) yuzaga kelishini oldini oladi.
 */
@Module({
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
