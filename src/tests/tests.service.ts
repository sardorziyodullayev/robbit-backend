import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Test } from "./test.entity";
import { Question } from "./question.entity";
import { Attempt } from "./attempt.entity";
import { Course } from "../courses/course.entity";
import {
  CreateQuestionDto,
  CreateTestDto,
  SubmitTestDto,
} from "./dto/test.dto";

export interface QuestionView {
  id: number;
  text: string;
  type: "multiple_choice" | "open_ended" | "code";
  options?: string[];
  order: number;
  correctAnswer?: string;
}

export interface TestView {
  id: number;
  title: string;
  courseId: number;
  lessonId?: number | null;
  questions: QuestionView[];
}

export interface AttemptAnswerDetail {
  questionId: number;
  userAnswer: string;
  correctAnswer?: string;
  isCorrect: boolean;
  aiScore?: number;
  aiFeedback?: string;
}

export interface AttemptResultView {
  id: number;
  testId: number;
  score: number;
  maxScore: number;
  percent: number;
  timeTaken?: number;
  aiAnalysis?: string;
  details?: AttemptAnswerDetail[];
  createdAt: string;
}

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test) private readonly tests: Repository<Test>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
  ) {}

  async byCourse(courseId: number): Promise<TestView[]> {
    const items = await this.tests.find({
      where: { courseId },
      relations: ["questions"],
      order: { createdAt: "DESC" },
    });
    return items.map((t) => this.toView(t, false));
  }

  async getOne(id: number, withAnswers = false): Promise<TestView> {
    const t = await this.tests.findOne({
      where: { id },
      relations: ["questions"],
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    return this.toView(t, withAnswers);
  }

  async create(dto: CreateTestDto): Promise<TestView> {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException("Kurs topilmadi");
    const t = this.tests.create({
      title: dto.title,
      courseId: dto.courseId,
      lessonId: dto.lessonId ?? null,
    });
    const saved = await this.tests.save(t);
    if (dto.questions?.length) {
      const qs = dto.questions.map((q, idx) =>
        this.makeQuestion(q, saved.id, idx + 1),
      );
      await this.questions.save(qs);
    }
    return this.getOne(saved.id, true);
  }

  async submit(testId: number, userId: string, dto: SubmitTestDto): Promise<AttemptResultView> {
    const test = await this.tests.findOne({
      where: { id: testId },
      relations: ["questions"],
    });
    if (!test) throw new NotFoundException("Test topilmadi");
    const byId = new Map(test.questions.map((q) => [q.id, q]));
    const details: AttemptAnswerDetail[] = [];
    let score = 0;
    for (const a of dto.answers) {
      const q = byId.get(a.questionId);
      if (!q) continue;
      const correctAnswer = q.correctAnswer ?? undefined;
      const isCorrect = this.isAnswerCorrect(q, a.answer);
      if (isCorrect) score += 1;
      details.push({
        questionId: a.questionId,
        userAnswer: a.answer,
        correctAnswer,
        isCorrect,
      });
    }
    const maxScore = test.questions.length;
    const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
    const attempt = this.attempts.create({
      testId,
      userId,
      score,
      maxScore,
      percent,
      timeTaken: dto.timeTaken ?? null,
      detailsJson: JSON.stringify(details),
      aiAnalysis: null,
    });
    const saved = await this.attempts.save(attempt);
    return this.attemptView(saved, details);
  }

  async getAttempt(attemptId: number, userId: string): Promise<AttemptResultView> {
    const a = await this.attempts.findOne({ where: { id: attemptId } });
    if (!a) throw new NotFoundException("Urinish topilmadi");
    if (a.userId !== userId) {
      throw new NotFoundException("Urinish topilmadi");
    }
    const details = JSON.parse(a.detailsJson) as AttemptAnswerDetail[];
    return this.attemptView(a, details);
  }

  private makeQuestion(dto: CreateQuestionDto, testId: number, order: number): Question {
    return this.questions.create({
      testId,
      text: dto.text,
      type: dto.type,
      optionsJson: dto.options ? JSON.stringify(dto.options) : null,
      correctAnswer: dto.correctAnswer ?? null,
      order: dto.order ?? order,
    });
  }

  private isAnswerCorrect(q: Question, userAnswer: string): boolean {
    if (!q.correctAnswer) return false;
    return q.correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
  }

  private toView(t: Test, withAnswers: boolean): TestView {
    return {
      id: t.id,
      title: t.title,
      courseId: t.courseId,
      lessonId: t.lessonId ?? undefined,
      questions: (t.questions ?? [])
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : undefined,
          order: q.order,
          correctAnswer: withAnswers ? q.correctAnswer ?? undefined : undefined,
        })),
    };
  }

  private attemptView(a: Attempt, details: AttemptAnswerDetail[]): AttemptResultView {
    return {
      id: a.id,
      testId: a.testId,
      score: a.score,
      maxScore: a.maxScore,
      percent: a.percent,
      timeTaken: a.timeTaken ?? undefined,
      aiAnalysis: a.aiAnalysis ?? undefined,
      details,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
