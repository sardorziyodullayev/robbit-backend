import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
import * as bcrypt from "bcryptjs";

import { User } from "../users/user.entity";
import { Branch } from "./branch.entity";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Attempt } from "../tests/attempt.entity";
import {
  AdminUserListDto,
  ChangeRoleDto,
  CreateBranchDto,
  ResetPasswordDto,
  UpdateBranchDto,
} from "./dto/admin.dto";
import { Paginated, parsePagination } from "../common/pagination";
import { ProfileView } from "../profile/profile.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
  ) {}

  async listUsers(query: AdminUserListDto): Promise<Paginated<ProfileView>> {
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
    return {
      items: items.map((u) => this.toProfile(u)),
      total,
      page,
      limit,
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
