import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "../users/user.entity";
import { Branch } from "./branch.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Attempt } from "../tests/attempt.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Branch, Course, Lesson, Attempt]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
