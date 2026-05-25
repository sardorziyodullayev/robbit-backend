import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "../users/user.entity";
import { Attempt } from "../tests/attempt.entity";
import { Test } from "../tests/test.entity";
import { Course } from "../courses/course.entity";
import { Certificate } from "./certificate.entity";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Attempt, Test, Course, Certificate])],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
