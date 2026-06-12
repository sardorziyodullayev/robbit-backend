import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";
import * as bcrypt from "bcryptjs";

import { User } from "../users/user.entity";
import { Branch } from "./branch.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { LessonProgress } from "../lessons/lesson-progress.entity";
import { Attempt } from "../tests/attempt.entity";
import { Review } from "../courses/review.entity";
import { Enrollment } from "../enrollment/enrollment.entity";
import { Certificate } from "../profile/certificate.entity";
import {
  AdminReviewListDto,
  AdminUserListDto,
  ChangeRoleDto,
  CreateBranchDto,
  ResetPasswordDto,
  UpdateBranchDto,
  UpdateUserDto,
} from "./dto/admin.dto";
import { Paginated, parsePagination } from "../common/pagination";
import { ProfileView } from "../profile/profile.service";
import { StorageService } from "../common/storage/storage.service";

interface AdminReviewView {
  id: number;
  rating: number;
  comment: string | null;
  courseId: number;
  courseTitle: string | null;
  userId: string;
  user: { id: string; name: string; email: string } | null;
  createdAt?: string;
}

type AdminUserView = ProfileView & { progress: number | null };

interface CourseProgress {
  courseId: number;
  title: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
}

interface UserProgressView {
  overall: { totalLessons: number; completedLessons: number; percent: number };
  courses: CourseProgress[];
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(LessonProgress) private readonly lessonProgress: Repository<LessonProgress>,
    private readonly storage: StorageService,
  ) {}

  async listUsers(query: AdminUserListDto): Promise<Paginated<AdminUserView>> {
    const { page, limit, skip, take } = parsePagination(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.username = Like(`%${query.search}%`);
    const [items, total] = await this.users.findAndCount({
      where,
      skip,
      take,
      order: { createdAt: "DESC" },
    });
    const views = await Promise.all(
      items.map(async (u) => ({
        ...this.toProfile(u),
        progress: await this.overallProgress(u),
      })),
    );
    return { items: views, total, page, limit };
  }

  /**
   * Foydalanuvchining umumiy progressi: yozilgan kurslaridagi tugatilgan
   * darslar foizi. Faqat STUDENT uchun hisoblanadi (mentor/admin → null).
   */
  private async overallProgress(user: User): Promise<number | null> {
    if (user.role !== "STUDENT") return null;
    const enrollments = await this.enrollments.find({ where: { userId: user.id } });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return null;
    const total = await this.lessons.count({ where: { courseId: In(courseIds) } });
    if (total === 0) return null;
    const completed = await this.lessonProgress
      .createQueryBuilder("p")
      .innerJoin("lessons", "l", "l.id = p.lessonId")
      .where("p.userId = :userId", { userId: user.id })
      .andWhere("l.courseId IN (:...courseIds)", { courseIds })
      .getCount();
    return Math.round((completed / total) * 100);
  }

  /** Foydalanuvchi progressini kurslar kesimida batafsil qaytaradi. */
  async userProgress(id: string): Promise<UserProgressView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    const enrollments = await this.enrollments.find({ where: { userId: id } });
    const courseIds = enrollments.map((e) => e.courseId);
    const empty = { overall: { totalLessons: 0, completedLessons: 0, percent: 0 }, courses: [] };
    if (courseIds.length === 0) return empty;

    const courses = await this.courses.find({ where: { id: In(courseIds) } });
    const completedRows = await this.lessonProgress
      .createQueryBuilder("p")
      .innerJoin("lessons", "l", "l.id = p.lessonId")
      .select("l.courseId", "courseId")
      .addSelect("COUNT(*)", "cnt")
      .where("p.userId = :id", { id })
      .andWhere("l.courseId IN (:...courseIds)", { courseIds })
      .groupBy("l.courseId")
      .getRawMany<{ courseId: number; cnt: string }>();
    const completedByCourse = new Map(completedRows.map((r) => [Number(r.courseId), Number(r.cnt)]));

    const perCourse: CourseProgress[] = await Promise.all(
      courses.map(async (c) => {
        const totalLessons = await this.lessons.count({ where: { courseId: c.id } });
        const completedLessons = completedByCourse.get(c.id) ?? 0;
        return {
          courseId: c.id,
          title: c.title,
          totalLessons,
          completedLessons,
          percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
        };
      }),
    );

    const totalLessons = perCourse.reduce((s, p) => s + p.totalLessons, 0);
    const completedLessons = perCourse.reduce((s, p) => s + p.completedLessons, 0);
    return {
      overall: {
        totalLessons,
        completedLessons,
        percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
      courses: perCourse,
    };
  }

  async userById(id: string): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    return this.toProfile(u);
  }

  async toggleActive(id: string): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    u.isActive = !u.isActive;
    return this.toProfile(await this.users.save(u));
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    u.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(u);
  }

  async changeRole(id: string, dto: ChangeRoleDto): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    u.role = dto.role;
    return this.toProfile(await this.users.save(u));
  }

  // Admin tomonidan foydalanuvchi profilini to'liq yangilash.
  async updateUser(id: string, dto: UpdateUserDto): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (dto.firstName !== undefined) u.firstName = dto.firstName || null;
    if (dto.lastName !== undefined) u.lastName = dto.lastName || null;
    if (dto.age !== undefined) u.age = dto.age ?? null;
    if (dto.gender !== undefined) u.gender = dto.gender ?? null;
    if (dto.phone !== undefined) u.phone = dto.phone || null;
    if (dto.role !== undefined) u.role = dto.role;
    if (dto.branchId !== undefined) {
      if (dto.branchId) {
        const b = await this.branches.findOne({ where: { id: dto.branchId } });
        if (!b) throw new BadRequestException("Filial topilmadi");
        u.branchId = dto.branchId;
      } else {
        u.branchId = null;
      }
    }
    await this.users.save(u);
    return this.userById(id);
  }

  async uploadUserAvatar(id: string, file: Express.Multer.File): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (!file) throw new BadRequestException("Fayl yuborilmadi");
    if (u.avatar) await this.storage.delete(u.avatar);
    const stored = await this.storage.upload(file, { prefix: "avatar" });
    u.avatar = stored.url;
    return this.toProfile(await this.users.save(u));
  }

  async deleteUserAvatar(id: string): Promise<ProfileView> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    if (u.avatar) await this.storage.delete(u.avatar);
    u.avatar = null;
    return this.toProfile(await this.users.save(u));
  }

  async deleteUser(id: string): Promise<void> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    await this.users.remove(u);
  }

  /* ─────────── Izohlar (reviewlar) ─────────── */
  async listReviews(query: AdminReviewListDto): Promise<Paginated<AdminReviewView>> {
    const { page, limit, skip, take } = parsePagination(query.page, query.limit);
    const where = query.search ? { comment: Like(`%${query.search}%`) } : {};
    const [items, total] = await this.reviews.findAndCount({
      where,
      skip,
      take,
      order: { createdAt: "DESC" },
    });
    return { items: await this.decorateReviews(items), total, page, limit };
  }

  async deleteReview(id: number): Promise<void> {
    const r = await this.reviews.findOne({ where: { id } });
    if (!r) throw new NotFoundException("Izoh topilmadi");
    await this.reviews.remove(r);
  }

  /* ─────────── Dashboard ─────────── */
  async dashboard() {
    const [totalCourses, totalUsers] = await Promise.all([
      this.courses.count(),
      this.users.count(),
    ]);
    const completedRaw = await this.certificates
      .createQueryBuilder("c")
      .select("COUNT(DISTINCT c.userId)", "cnt")
      .getRawOne<{ cnt: string }>();
    const completedUsers = Number(completedRaw?.cnt ?? 0);
    const avgRating = await this.courseAvg();

    const topRaw = await this.enrollments
      .createQueryBuilder("e")
      .select("e.courseId", "courseId")
      .addSelect("COUNT(*)", "cnt")
      .groupBy("e.courseId")
      .orderBy("cnt", "DESC")
      .limit(5)
      .getRawMany<{ courseId: number; cnt: string }>();

    let topCourses: { id: number; title: string; enrollmentCount: number; avgRating: number | null }[];
    if (topRaw.length) {
      const ids = topRaw.map((t) => Number(t.courseId));
      const courses = await this.courses.find({ where: { id: In(ids) } });
      const byId = new Map(courses.map((c) => [c.id, c]));
      topCourses = await Promise.all(
        topRaw.map(async (t) => {
          const id = Number(t.courseId);
          return {
            id,
            title: byId.get(id)?.title ?? "—",
            enrollmentCount: Number(t.cnt),
            avgRating: await this.courseAvg(id),
          };
        }),
      );
    } else {
      const recent = await this.courses.find({ order: { createdAt: "DESC" }, take: 5 });
      topCourses = await Promise.all(
        recent.map(async (c) => ({
          id: c.id,
          title: c.title,
          enrollmentCount: 0,
          avgRating: await this.courseAvg(c.id),
        })),
      );
    }

    const recentReviewsRaw = await this.reviews.find({ order: { createdAt: "DESC" }, take: 5 });
    const recentReviews = await this.decorateReviews(recentReviewsRaw);

    return {
      stats: { totalCourses, totalUsers, completedUsers, avgRating },
      topCourses,
      recentReviews,
    };
  }

  private async courseAvg(courseId?: number): Promise<number | null> {
    const qb = this.reviews.createQueryBuilder("r").select("AVG(r.rating)", "avg");
    if (courseId != null) qb.where("r.courseId = :courseId", { courseId });
    const raw = await qb.getRawOne<{ avg: string | null }>();
    return raw?.avg != null ? Number(Number(raw.avg).toFixed(1)) : null;
  }

  private async decorateReviews(items: Review[]): Promise<AdminReviewView[]> {
    const courseIds = [...new Set(items.map((r) => r.courseId))];
    const courses = courseIds.length
      ? await this.courses.find({ where: { id: In(courseIds) } })
      : [];
    const titleById = new Map(courses.map((c) => [c.id, c.title]));
    return items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      courseId: r.courseId,
      courseTitle: titleById.get(r.courseId) ?? null,
      userId: r.userId,
      user: r.user
        ? {
            id: r.user.id,
            name:
              [r.user.firstName, r.user.lastName].filter(Boolean).join(" ").trim() ||
              r.user.username,
            email: r.user.email,
          }
        : null,
      createdAt: r.createdAt?.toISOString(),
    }));
  }

  async stats() {
    const [users, courses, lessons, attempts] = await Promise.all([
      this.users.count(),
      this.courses.count(),
      this.lessons.count(),
      this.attempts.count(),
    ]);
    const students = await this.users.count({ where: { role: "STUDENT" } });
    const mentors = await this.users.count({ where: { role: "MENTOR" } });
    const publishedCourses = await this.courses.count({ where: { isPublished: true } });
    return {
      totalUsers: users,
      totalStudents: students,
      totalMentors: mentors,
      totalCourses: courses,
      publishedCourses,
      totalLessons: lessons,
      totalAttempts: attempts,
    };
  }

  listBranches() {
    return this.branches.find({ order: { name: "ASC" } });
  }

  async branchById(id: string) {
    const b = await this.branches.findOne({ where: { id } });
    if (!b) throw new NotFoundException("Filial topilmadi");
    return b;
  }

  async createBranch(dto: CreateBranchDto) {
    if (await this.branches.findOne({ where: { name: dto.name } })) {
      throw new BadRequestException("Filial nomi band");
    }
    return this.branches.save(
      this.branches.create({ name: dto.name, address: dto.address ?? null }),
    );
  }

  async updateBranch(id: string, dto: UpdateBranchDto) {
    const b = await this.branchById(id);
    if (dto.name !== undefined) b.name = dto.name;
    if (dto.address !== undefined) b.address = dto.address ?? null;
    return this.branches.save(b);
  }

  async deleteBranch(id: string) {
    const b = await this.branchById(id);
    await this.branches.remove(b);
  }

  private toProfile(u: User): ProfileView {
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
