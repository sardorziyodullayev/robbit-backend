import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type GenerateMode = "multiple_choice" | "open_ended" | "mixed";

export interface GenerateQuestionsParams {
  topic: string;
  count: number;
  mode: GenerateMode;
  courseTitle?: string;
}

export interface GeneratedQuestion {
  text: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  correctAnswer: string;
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

const MAX_QUESTIONS = 20;
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * OpenAI (ChatGPT) chat-completions API orqali mavzuga mos test savollarini
 * generatsiya qiladi. Tashqi SDK ishlatmaydi — Node 20+ ning global fetch'idan
 * foydalanadi. OPENAI_API_KEY o'rnatilmagan bo'lsa, savol generatsiya so'ralganda
 * tushunarli xato qaytaradi (fail-fast).
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);

  constructor(private readonly cfg: ConfigService) {}

  async generateQuestions(
    params: GenerateQuestionsParams,
  ): Promise<GeneratedQuestion[]> {
    const apiKey = this.cfg.get<string>("OPENAI_API_KEY");
    if (!apiKey || !apiKey.trim()) {
      throw new ServiceUnavailableException(
        "AI test generatsiyasi sozlanmagan: OPENAI_API_KEY o'rnatilmagan.",
      );
    }
    const model = this.cfg.get<string>("OPENAI_MODEL") ?? "gpt-4o-mini";
    const baseUrl = (
      this.cfg.get<string>("OPENAI_BASE_URL") ?? "https://api.openai.com/v1"
    ).replace(/\/$/, "");

    const count = Math.min(Math.max(params.count, 1), MAX_QUESTIONS);
    const { systemPrompt, userPrompt } = this.buildPrompts({ ...params, count });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const reason =
        (err as Error).name === "AbortError"
          ? "vaqt tugadi (timeout)"
          : (err as Error).message;
      throw new ServiceUnavailableException(`AI xizmatiga ulanib bo'lmadi: ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`OpenAI ${res.status}: ${body.slice(0, 500)}`);
      throw new ServiceUnavailableException(
        `AI xizmati xato qaytardi (status ${res.status})`,
      );
    }

    const data = (await res.json()) as OpenAiChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException("AI bo'sh javob qaytardi");
    }

    return this.parseQuestions(content, count);
  }

  private buildPrompts(params: GenerateQuestionsParams & { count: number }) {
    const { topic, count, mode, courseTitle } = params;
    const courseLine = courseTitle ? `Kurs konteksti: "${courseTitle}".` : "";

    let typeInstruction: string;
    if (mode === "multiple_choice") {
      typeInstruction =
        'Barcha savollar "multiple_choice" turida bo\'lsin (har birida 4 ta variant).';
    } else if (mode === "open_ended") {
      typeInstruction =
        'Barcha savollar "open_ended" turida bo\'lsin (variantlarsiz, ochiq javob).';
    } else {
      typeInstruction =
        'Savollar "multiple_choice" va "open_ended" turlari aralash bo\'lsin (taxminan teng nisbatda).';
    }

    const systemPrompt = [
      "Sen tajribali o'qituvchi va test tuzuvchisan.",
      "Berilgan mavzu bo'yicha aniq, mazmunli va to'g'ri test savollarini tuzasan.",
      "Savollar mavzu tilida (o'zbek tilida) bo'lishi shart.",
      "Faqat JSON qaytar — hech qanday izoh, markdown yoki qo'shimcha matn yo'q.",
    ].join(" ");

    const userPrompt = [
      `Mavzu: "${topic}".`,
      courseLine,
      `Aynan ${count} ta test savoli tuz.`,
      typeInstruction,
      "",
      "Javobni quyidagi JSON sxemasida qaytar:",
      "{",
      '  "questions": [',
      "    {",
      '      "text": "savol matni",',
      '      "type": "multiple_choice" | "open_ended",',
      '      "options": ["variant 1", "variant 2", "variant 3", "variant 4"],',
      '      "correctAnswer": "to\'g\'ri javob"',
      "    }",
      "  ]",
      "}",
      "",
      'Qoidalar: "multiple_choice" uchun "options" 4 ta bo\'lsin va "correctAnswer"',
      'ulardan biriga AYNAN teng bo\'lsin. "open_ended" uchun "options" bo\'lmasin,',
      '"correctAnswer" esa namunaviy to\'g\'ri javob bo\'lsin.',
    ].join("\n");

    return { systemPrompt, userPrompt };
  }

  private parseQuestions(content: string, expected: number): GeneratedQuestion[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      this.logger.error(`AI JSON parse xatosi: ${content.slice(0, 300)}`);
      throw new ServiceUnavailableException("AI javobini o'qib bo'lmadi (JSON emas)");
    }

    const rawList = (parsed as { questions?: unknown }).questions;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new ServiceUnavailableException("AI savollar ro'yxatini qaytarmadi");
    }

    const questions: GeneratedQuestion[] = [];
    for (const raw of rawList) {
      const q = this.normalizeQuestion(raw);
      if (q) questions.push(q);
      if (questions.length >= expected) break;
    }

    if (questions.length === 0) {
      throw new ServiceUnavailableException("AI yaroqli savol qaytarmadi");
    }
    return questions;
  }

  private normalizeQuestion(raw: unknown): GeneratedQuestion | null {
    if (typeof raw !== "object" || raw === null) return null;
    const obj = raw as Record<string, unknown>;

    const text = typeof obj.text === "string" ? obj.text.trim() : "";
    if (!text) return null;

    const isOpenEnded = obj.type === "open_ended";

    if (isOpenEnded) {
      const correctAnswer =
        typeof obj.correctAnswer === "string" ? obj.correctAnswer.trim() : "";
      return { text, type: "open_ended", correctAnswer };
    }

    // multiple_choice
    const options = Array.isArray(obj.options)
      ? obj.options.filter((o): o is string => typeof o === "string").map((o) => o.trim())
      : [];
    if (options.length < 2) return null;

    const rawCorrect =
      typeof obj.correctAnswer === "string" ? obj.correctAnswer.trim() : "";
    // correctAnswer aynan variantlardan biri bo'lishini ta'minlaymiz.
    const exact = options.find((o) => o === rawCorrect);
    const ciMatch = options.find(
      (o) => o.toLowerCase() === rawCorrect.toLowerCase(),
    );
    const correctAnswer = exact ?? ciMatch ?? options[0];

    return { text, type: "multiple_choice", options, correctAnswer };
  }
}
