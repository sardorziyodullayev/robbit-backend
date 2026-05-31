import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Test } from "../tests/test.entity";
import { Question } from "../tests/question.entity";
import { Course } from "../courses/course.entity";
import { Attempt } from "../tests/attempt.entity";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { OpenAiModule } from "./openai.module";
import { TestsModule } from "../tests/tests.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, Question, Course, Attempt]),
    OpenAiModule,
    TestsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
