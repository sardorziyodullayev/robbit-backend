import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Test } from "../tests/test.entity";
import { Question } from "../tests/question.entity";
import { Course } from "../courses/course.entity";
import { EvaluateCodeDto, EvaluateTextDto, GenerateTestDto } from "./dto/ai.dto";
import { TestsService } from "../tests/tests.service";

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Test) private readonly tests: Repository<Test>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly testsService: TestsService,
  ) {}

  async generateTest(dto: GenerateTestDto) {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException("Kurs topilmadi");
    const count = dto.count ?? 5;
    const mode = dto.type ?? "multiple_choice";

    const test = this.tests.create({
      title: `AI: ${dto.topic}`,
      courseId: dto.courseId,
      lessonId: null,
    });
    const saved = await this.tests.save(test);

    const generated: Question[] = [];
    for (let i = 0; i < count; i++) {
      const type =
        mode === "mixed" ? (i % 2 === 0 ? "multiple_choice" : "open_ended") : mode;
      if (type === "multiple_choice") {
        const correctIdx = i % 4;
        const options = ["A", "B", "C", "D"].map(
          (letter, idx) => `${letter}) ${dto.topic} variant ${idx + 1}`,
        );
        generated.push(
          this.questions.create({
            testId: saved.id,
            text: `${dto.topic} bo'yicha ${i + 1}-savol`,
            type: "multiple_choice",
            optionsJson: JSON.stringify(options),
            correctAnswer: options[correctIdx],
            order: i + 1,
          }),
        );
      } else {
        generated.push(
          this.questions.create({
            testId: saved.id,
            text: `${dto.topic} mavzusi bo'yicha ${i + 1}-ochiq savol`,
            type: "open_ended",
            optionsJson: null,
            correctAnswer: dto.topic,
            order: i + 1,
          }),
        );
      }
    }
    await this.questions.save(generated);
    return this.testsService.getOne(saved.id, true);
  }

  evaluateText(dto: EvaluateTextDto) {
    return this.heuristicEvaluate(dto.question, dto.answer);
  }

  evaluateCode(dto: EvaluateCodeDto) {
    const base = this.heuristicEvaluate(dto.question, dto.code);
    return {
      ...base,
      feedback: `${base.feedback} (${dto.language ?? "code"})`,
    };
  }

  evaluateImage(question: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Rasm yuborilmadi");
    return this.heuristicEvaluate(question, file.originalname);
  }

  private heuristicEvaluate(question: string, answer: string) {
    const q = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const a = answer.toLowerCase();
    const matched = q.filter((w) => a.includes(w)).length;
    const ratio = q.length === 0 ? 0.5 : matched / q.length;
    const score = Math.round(50 + ratio * 50);
    const feedback =
      score >= 80
        ? "Yaxshi javob, savolning asosiy fikrlarini qamrab olgan."
        : score >= 60
          ? "O'rtacha javob, ba'zi tafsilotlar qo'shilsa yaxshi bo'ladi."
          : "Javob etarli emas, savolga to'liq mos kelmagan.";
    return { score, feedback };
  }
}
