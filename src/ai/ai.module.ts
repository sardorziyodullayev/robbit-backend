import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Test } from "../tests/test.entity";
import { Question } from "../tests/question.entity";
import { Course } from "../courses/course.entity";
import { Attempt } from "../tests/attempt.entity";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { OpenAiService } from "./openai.service";
import { TestsService } from "../tests/tests.service";

@Module({
  imports: [TypeOrmModule.forFeature([Test, Question, Course, Attempt])],
  controllers: [AiController],
  providers: [AiService, OpenAiService, TestsService],
})
export class AiModule {}
