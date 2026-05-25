import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { APP_GUARD } from "@nestjs/core";
import { join } from "path";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CoursesModule } from "./courses/courses.module";
import { LessonsModule } from "./lessons/lessons.module";
import { TestsModule } from "./tests/tests.module";
import { ProfileModule } from "./profile/profile.module";
import { AiModule } from "./ai/ai.module";
import { AdminModule } from "./admin/admin.module";
import { SeedModule } from "./seed/seed.module";

import { User } from "./users/user.entity";
import { Branch } from "./admin/branch.entity";
import { Course } from "./courses/course.entity";
import { Category } from "./courses/category.entity";
import { Review } from "./courses/review.entity";
import { Lesson } from "./lessons/lesson.entity";
import { LessonProgress } from "./lessons/lesson-progress.entity";
import { Test } from "./tests/test.entity";
import { Question } from "./tests/question.entity";
import { Attempt } from "./tests/attempt.entity";
import { Certificate } from "./profile/certificate.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const entities = [
          User,
          Branch,
          Course,
          Category,
          Review,
          Lesson,
          LessonProgress,
          Test,
          Question,
          Attempt,
          Certificate,
        ];
        const synchronize = cfg.get<string>("DB_SYNC") !== "false";
        const driver = cfg.get<string>("DB_DRIVER") ?? "postgres";

        if (driver === "sqlite") {
          return {
            type: "better-sqlite3" as const,
            database: cfg.get<string>("DB_PATH") ?? "./robbit.sqlite",
            entities,
            synchronize,
          };
        }

        const url = cfg.get<string>("DATABASE_URL");
        const useSsl = cfg.get<string>("DB_SSL") === "true";
        return {
          type: "postgres" as const,
          ...(url
            ? { url }
            : {
                host: cfg.get<string>("DB_HOST") ?? "localhost",
                port: Number(cfg.get<string>("DB_PORT") ?? 5432),
                username: cfg.get<string>("DB_USER") ?? "robbit",
                password: cfg.get<string>("DB_PASS") ?? "robbit",
                database: cfg.get<string>("DB_NAME") ?? "robbit",
              }),
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          entities,
          synchronize,
        };
      },
    }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          rootPath: join(process.cwd(), cfg.get<string>("UPLOAD_DIR") ?? "./uploads"),
          serveRoot: "/uploads",
        },
      ],
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    TestsModule,
    ProfileModule,
    AiModule,
    AdminModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
