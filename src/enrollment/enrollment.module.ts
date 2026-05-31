import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Enrollment } from "./enrollment.entity";
import { Course } from "../courses/course.entity";
import { User } from "../users/user.entity";
import { EnrollmentService } from "./enrollment.service";
import { EnrollmentController } from "./enrollment.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Course, User])],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
