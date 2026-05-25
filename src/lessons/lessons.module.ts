import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Lesson } from "./lesson.entity";
import { LessonProgress } from "./lesson-progress.entity";
import { Course } from "../courses/course.entity";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, LessonProgress, Course])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
