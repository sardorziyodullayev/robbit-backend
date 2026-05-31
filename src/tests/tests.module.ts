import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Test } from "./test.entity";
import { Question } from "./question.entity";
import { Attempt } from "./attempt.entity";
import { Course } from "../courses/course.entity";
import { TestsController } from "./tests.controller";
import { TestsService } from "./tests.service";
import { OpenAiModule } from "../ai/openai.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, Question, Attempt, Course]),
    OpenAiModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
