import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";

import { Course } from "./course.entity";
import { Category } from "./category.entity";
import { Review } from "./review.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Enrollment } from "../enrollment/enrollment.entity";
import { User } from "../users/user.entity";
import {
  CreateCategoryDto,
  CreateCourseDto,
  UpdateCategoryDto,
  UpdateCourseDto,
} from "./dto/create-course.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ListCoursesDto } from "./dto/list-courses.dto";
import { Paginated, parsePagination } from "../common/pagination";
import { StorageService } from "../common/storage/storage.service";

export interface CategoryView {
  id: number;
  name: string;
  description: string | null;
  courseCount: number;
  createdAt?: string;
}

export interface CourseView {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  categoryId: number;
  category?: Category;
  mentorId?: string | null;
  mentor?: { id: string; name: string } | null;
  isPublished: boolean;
  thumbnail?: string | null;
  averageRating?: number;
  avgRating?: number | null;
  enrollmentCount?: number;
  lessonCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    private readonly storage: StorageService,
  ) {}

  async list(query: ListCoursesDto, includeUnpublished = false): Promise<Paginated<CourseView>> {
    const { page, limit, skip, take } = parsePagination(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (!includeUnpublished) where.isPublished = true;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) where.title = Like(`%${query.search}%`);
    const [items, total] = await this.courses.findAndCount({
      where,
      skip,
      take,
      order: { createdAt: "DESC" },
    });
    const views = await Promise.all(items.map((c) => this.toView(c)));
    return { items: views, total, page, limit };
  }

  async getOne(id: number): Promise<CourseView> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    return this.toView(c);
  }

  /* ─────────── Kategoriyalar ─────────── */
  async listCategories(): Promise<CategoryView[]> {
    const cats = await this.categories.find({ order: { id: "ASC" } });
    return Promise.all(
      cats.map(async (cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description ?? null,
        courseCount: await this.courses.count({ where: { categoryId: cat.id } }),
        createdAt: cat.createdAt?.toISOString(),
      })),
    );
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.categories.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException("Kategoriya allaqachon mavjud");
    return this.categories.save(
      this.categories.create({ name: dto.name, description: dto.description ?? null }),
    );
  }

  async updateCategory(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new NotFoundException("Kategoriya topilmadi");
    if (dto.name !== undefined && dto.name !== cat.name) {
      const clash = await this.categories.findOne({ where: { name: dto.name } });
      if (clash) throw new BadRequestException("Kategoriya nomi band");
      cat.name = dto.name;
    }
    if (dto.description !== undefined) cat.description = dto.description ?? null;
    return this.categories.save(cat);
  }

  async removeCategory(id: number): Promise<void> {
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new NotFoundException("Kategoriya topilmadi");
    const used = await this.courses.count({ where: { categoryId: id } });
    if (used > 0) {
      throw new BadRequestException("Kategoriyaga bog‘langan kurslar mavjud — avval ularni o‘chiring");
    }
    await this.categories.remove(cat);
  }

  /* ─────────── Kurslar ─────────── */
  async create(dto: CreateCourseDto): Promise<CourseView> {
    const category = await this.categories.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException("Kategoriya topilmadi");
    const c = this.courses.create({
      title: dto.title,
      description: dto.description ?? null,
      price: dto.price ?? 0,
      categoryId: dto.categoryId,
      mentorId: dto.mentorId ?? null,
      isPublished: false,
    });
    const saved = await this.courses.save(c);
    return this.getOne(saved.id);
  }

  async update(id: number, dto: UpdateCourseDto): Promise<CourseView> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    if (dto.categoryId !== undefined) {
      const cat = await this.categories.findOne({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException("Kategoriya topilmadi");
      c.categoryId = dto.categoryId;
    }
    if (dto.title !== undefined) c.title = dto.title;
    if (dto.description !== undefined) c.description = dto.description ?? null;
    if (dto.price !== undefined) c.price = dto.price;
    if (dto.mentorId !== undefined) c.mentorId = dto.mentorId ?? null;
    await this.courses.save(c);
    return this.getOne(id);
  }

  async remove(id: number): Promise<void> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    await this.storage.delete(c.thumbnail);
    await this.courses.remove(c);
  }

  async attachThumbnail(id: number, file: Express.Multer.File): Promise<CourseView> {
    if (!file) throw new BadRequestException("Fayl yuborilmadi");
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    const stored = await this.storage.upload(file, { prefix: "course" });
    await this.storage.delete(c.thumbnail);
    c.thumbnail = stored.url;
    await this.courses.save(c);
    return this.getOne(id);
  }

  async setPublish(id: number, isPublished: boolean): Promise<CourseView> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    c.isPublished = isPublished;
    await this.courses.save(c);
    return this.getOne(id);
  }

  /* ─────────── Reviewlar ─────────── */
  async listReviews(courseId: number) {
    await this.assertExists(courseId);
    const items = await this.reviews.find({
      where: { courseId },
      order: { createdAt: "DESC" },
    });
    return items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? undefined,
      userId: r.userId,
      user: r.user ? { id: r.user.id, username: r.user.username } : undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async addReview(courseId: number, userId: string, dto: CreateReviewDto) {
    await this.assertExists(courseId);
    const r = this.reviews.create({
      courseId,
      userId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    const saved = await this.reviews.save(r);
    const full = await this.reviews.findOne({ where: { id: saved.id } });
    if (!full) throw new NotFoundException("Sharh topilmadi");
    return {
      id: full.id,
      rating: full.rating,
      comment: full.comment ?? undefined,
      userId: full.userId,
      user: full.user ? { id: full.user.id, username: full.user.username } : undefined,
      createdAt: full.createdAt.toISOString(),
    };
  }

  private async assertExists(id: number): Promise<void> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
  }

  private mentorName(u: User | null): { id: string; name: string } | null {
    if (!u) return null;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username;
    return { id: u.id, name };
  }

  private async toView(c: Course): Promise<CourseView> {
    const [lessonCount, reviews, enrollmentCount] = await Promise.all([
      this.lessons.count({ where: { courseId: c.id } }),
      this.reviews.find({ where: { courseId: c.id } }),
      this.enrollments.count({ where: { courseId: c.id } }),
    ]);
    const averageRating =
      reviews.length === 0
        ? 0
        : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      categoryId: c.categoryId,
      category: c.category,
      mentorId: c.mentorId,
      mentor: this.mentorName(c.mentor),
      isPublished: c.isPublished,
      thumbnail: c.thumbnail,
      averageRating: Number(averageRating.toFixed(2)),
      avgRating: reviews.length === 0 ? null : Number(averageRating.toFixed(2)),
      enrollmentCount,
      lessonCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
