import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Test } from "../tests/test.entity";
import { Question } from "../tests/question.entity";
import { Course } from "../courses/course.entity";
import { EvaluateCodeDto, EvaluateTextDto, GenerateTestDto } from "./dto/ai.dto";
import { TestsService } from "../tests/tests.service";
import { OpenAiService } from "./openai.service";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(Test) private readonly tests: Repository<Test>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly testsService: TestsService,
    private readonly openai: OpenAiService,
  ) {}

  async generateTest(dto: GenerateTestDto) {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException("Kurs topilmadi");
    const count = dto.count ?? 5;
    const mode = dto.type ?? "multiple_choice";

    // OpenAI'dan mavzuga mos haqiqiy savollarni olamiz. Bazada test yaratishdan
    // OLDIN chaqiramiz — AI xato bersa, bo'sh test qolib ketmasligi uchun.
    let generatedQuestions;
    try {
      generatedQuestions = await this.openai.generateQuestions({
        topic: dto.topic,
        count,
        mode,
        courseTitle: course.title,
      });
    } catch (err) {
      // AI (retry'lardan keyin ham) ishlamadi — shu kursdagi avval saqlangan
      // testlardan tasodifiy bittasini zaxira sifatida qaytaramiz.
      this.logger.warn(
        `AI test generatsiyasi muvaffaqiyatsiz (courseId=${dto.courseId}): ` +
          `${(err as Error).message}. Zaxira testdan foydalanamiz.`,
      );
      const fallback = await this.pickFallbackTest(dto.courseId);
      if (fallback) return fallback;
      // Zaxira ham yo'q bo'lsa, asl xatoni qaytaramiz.
      throw err;
    }

    const test = this.tests.create({
      title: `AI: ${dto.topic}`,
      courseId: dto.courseId,
      lessonId: null,
    });
    const saved = await this.tests.save(test);

    const questions = generatedQuestions.map((q, idx) =>
      this.questions.create({
        testId: saved.id,
        text: q.text,
        type: q.type,
        optionsJson:
          q.type === "multiple_choice" && q.options
            ? JSON.stringify(q.options)
            : null,
        correctAnswer: q.correctAnswer || null,
        order: idx + 1,
      }),
    );
    await this.questions.save(questions);
    return this.testsService.getOne(saved.id, true);
  }

  /**
   * AI ishlamay qolganda zaxira: shu kursdagi savolga ega testlardan birini
   * tasodifiy tanlab qaytaradi. Bunday test bo'lmasa null qaytaradi.
   */
  private async pickFallbackTest(courseId: number) {
    const candidates = await this.tests.find({
      where: { courseId },
      relations: ["questions"],
      order: { createdAt: "DESC" },
    });
    const usable = candidates.filter((t) => (t.questions?.length ?? 0) > 0);
    if (usable.length === 0) return null;
    const pick = usable[Math.floor(Math.random() * usable.length)];
    this.logger.log(
      `Zaxira test tanlandi (id=${pick.id}, courseId=${courseId}).`,
    );
    return this.testsService.getOne(pick.id, true);
  }

  evaluateText(dto: EvaluateTextDto) {
    return this.openai.evaluateAnswer({
      question: dto.question,
      answer: dto.answer,
    });
  }

  evaluateCode(dto: EvaluateCodeDto) {
    return this.openai.evaluateAnswer({
      question: dto.question,
      answer: dto.code,
      language: dto.language,
      isCode: true,
    });
  }

  evaluateImage(question: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Rasm yuborilmadi");
    const imageDataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    return this.openai.evaluateImageAnswer({ question, imageDataUri });
  }
}
