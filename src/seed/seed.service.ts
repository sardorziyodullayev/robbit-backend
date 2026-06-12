import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";

import { User } from "../users/user.entity";
import { Category } from "../courses/category.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Branch } from "../admin/branch.entity";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger("Seed");

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly cfg: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.cfg.get<string>("SEED_ON_START") !== "true") return;
    await this.ensureAdmin();
    await this.ensureCategories();
    await this.ensureCoursesAndLessons();
  }

  private async ensureAdmin() {
    const username = this.cfg.get<string>("ADMIN_USERNAME") ?? "admin";
    const email = this.cfg.get<string>("ADMIN_EMAIL") ?? "admin@robbit.local";
    const password = this.cfg.get<string>("ADMIN_PASSWORD") ?? "Admin@123";
    const existing = await this.users.findOne({ where: { username } });

    if (existing) {
      // Admin allaqachon bor — parol/rol/holatni env qiymatlari bilan
      // sinxronlaymiz, shunda serverda ADMIN_PASSWORD o'zgartirilsa ham
      // login har doim env'dagi parol bilan ishlaydi.
      const passwordMatches = await bcrypt.compare(password, existing.passwordHash);
      const needsUpdate =
        !passwordMatches || existing.role !== "SUPER_ADMIN" || !existing.isActive;
      if (needsUpdate) {
        existing.passwordHash = await bcrypt.hash(password, 10);
        existing.role = "SUPER_ADMIN";
        existing.isActive = true;
        await this.users.save(existing);
        this.logger.log(`Admin '${username}' credentials synced with env`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(
      this.users.create({
        username,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      }),
    );
    this.logger.log(`Seeded admin '${username}'`);
  }

  private async ensureCategories() {
    const names = ["Frontend", "Backend", "DevOps", "Mobile", "AI"];
    for (const name of names) {
      const existing = await this.categories.findOne({ where: { name } });
      if (!existing) {
        await this.categories.save(this.categories.create({ name }));
      }
    }
  }

  private async ensureCoursesAndLessons() {
    if ((await this.courses.count()) > 0) return;
    const frontend = await this.categories.findOne({ where: { name: "Frontend" } });
    const backend = await this.categories.findOne({ where: { name: "Backend" } });
    if (!frontend || !backend) return;

    const samples = [
      {
        title: "React asoslari",
        description: "JSX, komponentlar, props va state.",
        price: 0,
        categoryId: frontend.id,
        isPublished: true,
        lessons: ["Kirish", "JSX", "Komponentlar", "Props", "State"],
      },
      {
        title: "NestJS asoslari",
        description: "Modullar, controllerlar, providerlar.",
        price: 0,
        categoryId: backend.id,
        isPublished: true,
        lessons: ["Kirish", "Modul", "Controller", "Provider", "Middleware"],
      },
    ];

    for (const s of samples) {
      const course = await this.courses.save(
        this.courses.create({
          title: s.title,
          description: s.description,
          price: s.price,
          categoryId: s.categoryId,
          isPublished: s.isPublished,
        }),
      );
      let order = 1;
      for (const title of s.lessons) {
        await this.lessons.save(
          this.lessons.create({
            title,
            description: `${course.title} - ${title}`,
            courseId: course.id,
            order: order++,
          }),
        );
      }
    }
    this.logger.log("Seeded sample courses & lessons");
  }
}
