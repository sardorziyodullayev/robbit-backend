import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";

import { Lesson } from "./lesson.entity";
import { LessonProgress } from "./lesson-progress.entity";
import { Course } from "../courses/course.entity";
import { CreateLessonDto, UpdateLessonDto } from "./dto/lesson.dto";
import { StorageService } from "../common/storage/storage.service";

export interface LessonView {
  id: number;
  title: string;
  description?: string | null;
  courseId: number;
  order: number;
  videoUrl?: string | null;
  isCompleted?: boolean;
}

export interface CourseProgressView {
  courseId: number;
  totalLessons: number;
  completedLessons: number;
  percent: number;
}

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonProgress) private readonly progress: Repository<LessonProgress>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly cfg: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async byCourse(courseId: number, userId?: string): Promise<LessonView[]> {
    const items = await this.lessons.find({
      where: { courseId },
      order: { order: "ASC", id: "ASC" },
    });
    let completedIds = new Set<number>();
    if (userId) {
      const progress = await this.progress.find({
        where: { userId },
      });
      completedIds = new Set(progress.map((p) => p.lessonId));
    }
    return items.map((l) => this.toView(l, completedIds.has(l.id)));
  }

  async getOne(id: number, userId?: string): Promise<LessonView> {
    const l = await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException("Dars topilmadi");
    let isCompleted = false;
    if (userId) {
      isCompleted = !!(await this.progress.findOne({
        where: { userId, lessonId: id },
      }));
    }
    return this.toView(l, isCompleted);
  }

  async create(dto: CreateLessonDto): Promise<LessonView> {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException("Kurs topilmadi");
    const maxOrder = await this.lessons
      .createQueryBuilder("l")
      .where("l.courseId = :id", { id: dto.courseId })
      .select("MAX(l.order)", "max")
      .getRawOne<{ max: number | null }>();
    const order = dto.order ?? (maxOrder?.max ?? 0) + 1;
    const l = this.lessons.create({
      title: dto.title,
      description: dto.description ?? null,
      courseId: dto.courseId,
      order,
    });
    return this.toView(await this.lessons.save(l));
  }

  async update(id: number, dto: UpdateLessonDto): Promise<LessonView> {
    const l = await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException("Dars topilmadi");
    if (dto.courseId !== undefined) {
      const c = await this.courses.findOne({ where: { id: dto.courseId } });
      if (!c) throw new BadRequestException("Kurs topilmadi");
      l.courseId = dto.courseId;
    }
    if (dto.title !== undefined) l.title = dto.title;
    if (dto.description !== undefined) l.description = dto.description ?? null;
    if (dto.order !== undefined) l.order = dto.order;
    return this.toView(await this.lessons.save(l));
  }

  async remove(id: number): Promise<void> {
    const l = await this.lessons.findOne({ where: { id } });
    if (!l) throw new NotFoundException("Dars topilmadi");
    await this.lessons.remove(l);
  }

  async markCompleted(lessonId: number, userId: string): Promise<void> {
    const l = await this.lessons.findOne({ where: { id: lessonId } });
    if (!l) throw new NotFoundException("Dars topilmadi");
    const existing = await this.progress.findOne({ where: { userId, lessonId } });
    if (existing) return;
    await this.progress.save(this.progress.create({ userId, lessonId }));
  }

  async courseProgress(courseId: number, userId: string): Promise<CourseProgressView> {
    const totalLessons = await this.lessons.count({ where: { courseId } });
    if (totalLessons === 0) {
      return { courseId, totalLessons: 0, completedLessons: 0, percent: 0 };
    }
    const completedLessons = await this.progress
      .createQueryBuilder("p")
      .innerJoin("lessons", "l", "l.id = p.lessonId")
      .where("p.userId = :userId AND l.courseId = :courseId", { userId, courseId })
      .getCount();
    return {
      courseId,
      totalLessons,
      completedLessons,
      percent: Math.round((completedLessons / totalLessons) * 100),
    };
  }

  async attachVideo(lessonId: number, file: Express.Multer.File): Promise<LessonView> {
    const l = await this.lessons.findOne({ where: { id: lessonId } });
    if (!l) throw new NotFoundException("Dars topilmadi");
    if (!file) throw new BadRequestException("Fayl yuborilmadi");
    if (l.videoUrl) await this.storage.delete(l.videoUrl);
    const stored = await this.storage.upload(file, { prefix: "lesson" });
    l.videoUrl = stored.url;
    return this.toView(await this.lessons.save(l));
  }

  toView(l: Lesson, isCompleted = false): LessonView {
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      courseId: l.courseId,
      order: l.order,
      videoUrl: l.videoUrl,
      isCompleted,
    };
  }
}
