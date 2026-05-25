import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "../users/user.entity";
import { Category } from "../courses/category.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Branch } from "../admin/branch.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Category, Course, Lesson, Branch])],
  providers: [SeedService],
})
export class SeedModule {}
