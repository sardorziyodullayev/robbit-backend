import { BadRequestException, Injectable } from "@nestjs/common";
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
    const generatedQuestions = await this.openai.generateQuestions({
      topic: dto.topic,
      count,
      mode,
      courseTitle: course.title,
    });

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
