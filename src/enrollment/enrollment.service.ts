import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Enrollment } from "./enrollment.entity";
import { Course } from "../courses/course.entity";
import { User } from "../users/user.entity";
import { AuthenticatedUser, Role } from "../common/interfaces/jwt-payload.interface";

// Bu rollar enrollmentdan qat'i nazar barcha kurslarga kira oladi.
const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "MENTOR"];

export interface EnrollmentView {
  id: number;
  userId: string;
  courseId: number;
  enrolledById: string | null;
  createdAt: string;
  user?: { id: string; username: string; email: string };
  course?: { id: number; title: string };
}

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async enroll(
    courseId: number,
    userId: string,
    enrolledById: string | null,
  ): Promise<EnrollmentView> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new BadRequestException("Kurs topilmadi");
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException("Foydalanuvchi topilmadi");

    const existing = await this.enrollments.findOne({
      where: { userId, courseId },
    });
    if (existing) {
      throw new BadRequestException("Foydalanuvchi bu kursga allaqachon yozilgan");
    }

    const saved = await this.enrollments.save(
      this.enrollments.create({ courseId, userId, enrolledById }),
    );
    return this.toView(saved, user, course);
  }

  async unenroll(courseId: number, userId: string): Promise<void> {
    const existing = await this.enrollments.findOne({
      where: { userId, courseId },
    });
    if (!existing) throw new NotFoundException("Yozuv topilmadi");
    await this.enrollments.remove(existing);
  }

  async listByCourse(courseId: number): Promise<EnrollmentView[]> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException("Kurs topilmadi");
    const items = await this.enrollments.find({
      where: { courseId },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
    return items.map((e) => this.toView(e, e.user));
  }

  async listMyCourses(userId: string): Promise<EnrollmentView[]> {
    const items = await this.enrollments.find({
      where: { userId },
      relations: ["course"],
      order: { createdAt: "DESC" },
    });
    return items.map((e) => this.toView(e, undefined, e.course));
  }

  async isEnrolled(userId: string, courseId: number): Promise<boolean> {
    const count = await this.enrollments.count({ where: { userId, courseId } });
    return count > 0;
  }

  /**
   * Foydalanuvchi kurs kontentiga (dars/test) kira olishini ta'minlaydi.
   * Admin/mentor har doim kira oladi; talaba esa faqat yozilgan bo'lsa.
   */
  async assertCanAccessCourse(
    user: AuthenticatedUser,
    courseId: number,
  ): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const enrolled = await this.isEnrolled(user.id, courseId);
    if (!enrolled) {
      throw new ForbiddenException("Siz bu kursga yozilmagansiz");
    }
  }

  private toView(e: Enrollment, user?: User, course?: Course): EnrollmentView {
    return {
      id: e.id,
      userId: e.userId,
      courseId: e.courseId,
      enrolledById: e.enrolledById,
      createdAt: e.createdAt.toISOString(),
      user: user
        ? { id: user.id, username: user.username, email: user.email }
        : undefined,
      course: course ? { id: course.id, title: course.title } : undefined,
    };
  }
}
