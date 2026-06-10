import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Course } from "./course.entity";
import { Category } from "./category.entity";
import { Review } from "./review.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Enrollment } from "../enrollment/enrollment.entity";
import { User } from "../users/user.entity";
import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";

@Module({
  imports: [TypeOrmModule.forFeature([Course, Category, Review, Lesson, Enrollment, User])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
