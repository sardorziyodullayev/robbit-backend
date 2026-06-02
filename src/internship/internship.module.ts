import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Internship } from "./internship.entity";
import { InternshipApplication } from "./internship-application.entity";
import { User } from "../users/user.entity";
import { InternshipService } from "./internship.service";
import { InternshipController } from "./internship.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Internship, InternshipApplication, User]),
  ],
  controllers: [InternshipController],
  providers: [InternshipService],
  exports: [InternshipService],
})
export class InternshipModule {}
