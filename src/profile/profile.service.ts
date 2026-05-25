import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { In, Repository } from "typeorm";
import * as bcrypt from "bcryptjs";

import { User } from "../users/user.entity";
import { Attempt } from "../tests/attempt.entity";
import { Test } from "../tests/test.entity";
import { Course } from "../courses/course.entity";
import { Certificate } from "./certificate.entity";
import { ChangePasswordDto, UpdateProfileDto } from "./dto/profile.dto";
import { Paginated, parsePagination } from "../common/pagination";

export interface ProfileView {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  age?: number | null;
  phone?: string | null;
  branch?: string | null;
  branchId?: string | null;
  gender?: "male" | "female" | null;
  avatar?: string | null;
  createdAt?: string;
}

export interface TestHistoryItemView {
  attemptId: number;
  testId: number;
  testTitle: string;
  courseTitle?: string;
  score: number;
  percent: number;
  createdAt: string;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
    @InjectRepository(Test) private readonly tests: Repository<Test>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Certificate) private readonly certificateRepo: Repository<Certificate>,
    private readonly cfg: ConfigService,
  ) {}

  async me(userId: string): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    return this.toView(u);
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (dto.firstName !== undefined) u.firstName = dto.firstName;
    if (dto.lastName !== undefined) u.lastName = dto.lastName;
    if (dto.age !== undefined) u.age = dto.age;
    if (dto.phone !== undefined) u.phone = dto.phone;
    if (dto.gender !== undefined) u.gender = dto.gender;
    if (dto.branch !== undefined) {
      // free-text branch name stored as branchId is left untouched; updating display value via firstName/lastName is enough
    }
    const saved = await this.users.save(u);
    return this.toView(saved);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    const ok = await bcrypt.compare(dto.oldPassword, u.passwordHash);
    if (!ok) throw new UnauthorizedException("Eski parol noto'g'ri");
    u.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(u);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (!file) throw new BadRequestException("Fayl yuborilmadi");
    const publicUrl = this.cfg.get<string>("PUBLIC_URL") ?? "";
    u.avatar = `${publicUrl}/uploads/${file.filename}`;
    return this.toView(await this.users.save(u));
  }

  async deleteAvatar(userId: string): Promise<void> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    u.avatar = null;
    await this.users.save(u);
  }

  async testHistory(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<Paginated<TestHistoryItemView>> {
    const { page: p, limit: l, skip, take } = parsePagination(page, limit);
    const [attempts, total] = await this.attempts.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip,
      take,
    });
    const testIds = [...new Set(attempts.map((a) => a.testId))];
    const tests = testIds.length
      ? await this.tests.find({ where: { id: In(testIds) } })
      : [];
    const courseIds = [...new Set(tests.map((t) => t.courseId))];
    const courses = courseIds.length
      ? await this.courses.find({ where: { id: In(courseIds) } })
      : [];
    const testMap = new Map(tests.map((t) => [t.id, t]));
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    return {
      items: attempts.map((a) => {
        const t = testMap.get(a.testId);
        const c = t ? courseMap.get(t.courseId) : undefined;
        return {
          attemptId: a.id,
          testId: a.testId,
          testTitle: t?.title ?? `Test #${a.testId}`,
          courseTitle: c?.title,
          score: a.score,
          percent: a.percent,
          createdAt: a.createdAt.toISOString(),
        };
      }),
      total,
      page: p,
      limit: l,
    };
  }

  async certificates(userId: string) {
    const list = await this.certificateRepo.find({
      where: { userId },
      order: { issuedAt: "DESC" },
    });
    return list.map((c) => ({
      id: c.id,
      courseId: c.courseId,
      courseTitle: c.course?.title ?? "",
      issuedAt: c.issuedAt.toISOString(),
      url: c.url ?? undefined,
    }));
  }

  private toView(u: User): ProfileView {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      age: u.age,
      phone: u.phone,
      branch: u.branch?.name ?? null,
      branchId: u.branchId,
      gender: u.gender,
      avatar: u.avatar,
      createdAt: u.createdAt?.toISOString(),
    };
  }
}
