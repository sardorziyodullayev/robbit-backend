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

export interface EvaluationResult {
  score: number;
  feedback: string;
}

type ChatMessage = { role: "system" | "user"; content: unknown };

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

const MAX_QUESTIONS = 20;
const REQUEST_TIMEOUT_MS = 90_000;
// Gemini/flash kabi modellar vaqti-vaqti bilan 429, bo'sh javob yoki noto'g'ri
// JSON qaytaradi. Shu o'tkinchi nuqsonlarda butun so'rovni yiqitmasdan qayta urinamiz.
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 600;

/**
 * Qayta urinish ma'nosiz bo'lgan holatlar uchun (masalan, API kaliti yo'q).
 * withRetry buni ushlamaydi — darhol yuqoriga uzatadi.
 */
class NonRetryableAiError extends ServiceUnavailableException {}

/**
 * OpenAI (ChatGPT) chat-completions API orqali ishlovchi xizmat: mavzuga mos test
 * savollarini generatsiya qiladi va foydalanuvchi javoblarini (matn, kod, rasm)
 * baholaydi. Tashqi SDK ishlatmaydi — Node 20+ ning global fetch'idan foydalanadi.
 * OPENAI_API_KEY o'rnatilmagan bo'lsa, har bir so'rovda tushunarli 503 qaytaradi.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);

  constructor(private readonly cfg: ConfigService) {}

  // ─── Test generatsiyasi ────────────────────────────────────────────────

  async generateQuestions(
    params: GenerateQuestionsParams,
  ): Promise<GeneratedQuestion[]> {
    const count = Math.min(Math.max(params.count, 1), MAX_QUESTIONS);
    const { systemPrompt, userPrompt } = this.buildGeneratePrompts({
      ...params,
      count,
    });

    // chatJson + parse'ni birga retry qilamiz: bo'sh yoki buzuq JSON ham
    // o'tkinchi nuqson — keyingi urinishda model to'g'ri javob berishi mumkin.
    return this.withRetry("generateQuestions", async () => {
      const content = await this.chatJson([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      return this.parseQuestions(content, count);
    });
  }

  // ─── Javoblarni baholash ───────────────────────────────────────────────

  async evaluateAnswer(params: {
    question: string;
    answer: string;
    language?: string;
    isCode?: boolean;
  }): Promise<EvaluationResult> {
    const { question, answer, language, isCode } = params;
    const kind = isCode
      ? `dasturlash kodi${language ? ` (${language})` : ""}`
      : "matnli javob";

    const systemPrompt = [
      "Sen adolatli va tajribali imtihon oluvchisan.",
      `Foydalanuvchining ${kind} ko'rinishidagi javobini savolga nisbatan baholaysan.`,
      isCode
        ? "Kodning to'g'riligi, mantiq, samaradorlik va savolga mosligini hisobga ol."
        : "Javobning to'g'riligi, to'liqligi va savolga mosligini hisobga ol.",
      "Faqat JSON qaytar, izohsiz.",
    ].join(" ");

    const userPrompt = [
      `Savol: ${question}`,
      `Javob: ${answer}`,
      "",
      "Quyidagi JSON sxemasida baho ber:",
      '{ "score": <0 dan 100 gacha butun son>, "feedback": "<qisqa izoh, o\'zbek tilida>" }',
    ].join("\n");

    return this.withRetry("evaluateAnswer", async () => {
      const content = await this.chatJson([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      return this.parseEvaluation(content);
    });
  }

  async evaluateImageAnswer(params: {
    question: string;
    imageDataUri: string;
  }): Promise<EvaluationResult> {
    const { question, imageDataUri } = params;

    const systemPrompt = [
      "Sen adolatli va tajribali imtihon oluvchisan.",
      "Foydalanuvchi yuborgan rasmni savolga nisbatan tahlil qilib baholaysan.",
      "Rasm mazmunini diqqat bilan ko'rib chiq.",
      "Faqat JSON qaytar, izohsiz.",
    ].join(" ");

    const content = await this.chatJson([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Savol: ${question || "Rasmni baholang."}`,
              "",
              "Quyidagi JSON sxemasida baho ber:",
              '{ "score": <0 dan 100 gacha butun son>, "feedback": "<qisqa izoh, o\'zbek tilida>" }',
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: imageDataUri } },
        ],
      },
    ]);

    return this.parseEvaluation(content);
  }

  // ─── Past darajadagi API chaqiruvi ─────────────────────────────────────

  private async chatJson(messages: ChatMessage[]): Promise<string> {
    const apiKey = this.cfg.get<string>("OPENAI_API_KEY");
    if (!apiKey || !apiKey.trim()) {
      // Kalit yo'q bo'lsa qayta urinish foydasiz — darhol yuqoriga uzatamiz.
      throw new NonRetryableAiError(
        "AI sozlanmagan: OPENAI_API_KEY o'rnatilmagan.",
      );
    }
    const model = this.cfg.get<string>("OPENAI_MODEL") ?? "gpt-4o-mini";
    const baseUrl = (
      this.cfg.get<string>("OPENAI_BASE_URL") ?? "https://api.openai.com/v1"
    ).replace(/\/$/, "");

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
          messages,
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const reason =
        (err as Error).name === "AbortError"
          ? "vaqt tugadi (timeout)"
          : (err as Error).message;
      throw new ServiceUnavailableException(
        `AI xizmatiga ulanib bo'lmadi: ${reason}`,
      );
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
    return content;
  }

  // ─── Qayta urinish (retry) ─────────────────────────────────────────────

  /**
   * fn'ni MAX_ATTEMPTS martagacha bajaradi. O'tkinchi AI nuqsonlarida
   * (timeout, 429, 5xx, bo'sh/buzuq JSON) ortib boruvchi kechikish bilan qayta
   * urinadi. NonRetryableAiError esa darhol yuqoriga uzatiladi.
   */
  private async withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (err instanceof NonRetryableAiError) throw err;
        if (attempt < MAX_ATTEMPTS) {
          const delay = RETRY_BASE_DELAY_MS * attempt;
          this.logger.warn(
            `${label}: ${attempt}-urinish muvaffaqiyatsiz (${(err as Error).message}). ${delay}ms dan keyin qayta urinamiz...`,
          );
          await this.sleep(delay);
        }
      }
    }
    throw lastErr;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Prompt va parsing yordamchilari ──────────────────────────────────

  private buildGeneratePrompts(params: GenerateQuestionsParams & { count: number }) {
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
    const parsed = this.safeParse(content);
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

  private parseEvaluation(content: string): EvaluationResult {
    const parsed = this.safeParse(content) as {
      score?: unknown;
      feedback?: unknown;
    };

    const rawScore =
      typeof parsed.score === "number"
        ? parsed.score
        : Number(parsed.score);
    const score = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : 0;

    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : "AI izoh qaytarmadi.";

    return { score, feedback };
  }

  private safeParse(content: string): unknown {
    // Avval to'g'ridan-to'g'ri, bo'lmasa tozalab urinamiz. Gemini/flash javobni
    // ko'pincha ```json ... ``` ichida yoki oldidan/keyin matn bilan qaytaradi.
    const candidates = [content, this.extractJson(content)];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        return JSON.parse(candidate);
      } catch {
        // keyingi nomzodga o'tamiz
      }
    }
    this.logger.error(`AI JSON parse xatosi: ${content.slice(0, 300)}`);
    throw new ServiceUnavailableException("AI javobini o'qib bo'lmadi (JSON emas)");
  }

  /**
   * Matn ichidan JSON qismini ajratib oladi: markdown ```json``` o'ramini olib
   * tashlaydi, so'ng birinchi "{" dan oxirgi "}" gacha kesib oladi.
   */
  private extractJson(content: string): string | null {
    let text = content.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
  }
}
