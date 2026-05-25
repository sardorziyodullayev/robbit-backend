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
import {
  CreateCategoryDto,
  CreateCourseDto,
  UpdateCourseDto,
} from "./dto/create-course.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ListCoursesDto } from "./dto/list-courses.dto";
import { Paginated, parsePagination } from "../common/pagination";

export interface CourseView {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  categoryId: number;
  category?: Category;
  isPublished: boolean;
  thumbnail?: string | null;
  averageRating?: number;
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

  async listCategories(): Promise<Category[]> {
    return this.categories.find({ order: { id: "ASC" } });
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.categories.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException("Kategoriya allaqachon mavjud");
    return this.categories.save(this.categories.create({ name: dto.name }));
  }

  async create(dto: CreateCourseDto): Promise<CourseView> {
    const category = await this.categories.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException("Kategoriya topilmadi");
    const c = this.courses.create({
      title: dto.title,
      description: dto.description ?? null,
      price: dto.price ?? 0,
      categoryId: dto.categoryId,
      isPublished: false,
    });
    const saved = await this.courses.save(c);
    return this.toView(saved);
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
    const saved = await this.courses.save(c);
    return this.toView(saved);
  }

  async remove(id: number): Promise<void> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) throw new NotFoundException("Kurs topilmadi");
    await this.courses.remove(c);
  }

  setPublish(id: number, isPublished: boolean): Promise<CourseView> {
    return this.update(id, {} as UpdateCourseDto).then(async () => {
      const c = await this.courses.findOne({ where: { id } });
      if (!c) throw new NotFoundException("Kurs topilmadi");
      c.isPublished = isPublished;
      const saved = await this.courses.save(c);
      return this.toView(saved);
    });
  }

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

  private async toView(c: Course): Promise<CourseView> {
    const lessonCount = await this.lessons.count({ where: { courseId: c.id } });
    const reviews = await this.reviews.find({ where: { courseId: c.id } });
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
      isPublished: c.isPublished,
      thumbnail: c.thumbnail,
      averageRating: Number(averageRating.toFixed(2)),
      lessonCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
