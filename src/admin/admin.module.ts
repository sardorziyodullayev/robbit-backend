import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "../users/user.entity";
import { Branch } from "./branch.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { LessonProgress } from "../lessons/lesson-progress.entity";
import { Attempt } from "../tests/attempt.entity";
import { Review } from "../courses/review.entity";
import { Enrollment } from "../enrollment/enrollment.entity";
import { Certificate } from "../profile/certificate.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Branch,
      Course,
      Lesson,
      LessonProgress,
      Attempt,
      Review,
      Enrollment,
      Certificate,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
