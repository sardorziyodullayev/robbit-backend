import { ConfigService } from "@nestjs/config";

/**
 * Majburiy env o'zgaruvchisini o'qiydi. Agar o'rnatilmagan (yoki bo'sh) bo'lsa —
 * zaif zaxira qiymat bilan ishlamasdan, ilovani ishga tushishida xato bilan
 * to'xtatadi (fail-fast). Bu, ayniqsa, JWT secret'lari uchun muhim: secret
 * unutilsa, hamma token taxmin qilinadigan qiymat bilan imzolanib qolmaydi.
 */
export function requireConfig(cfg: ConfigService, key: string): string {
  const value = cfg.get<string>(key);
  if (!value || !value.trim()) {
    throw new Error(
      `Majburiy environment o'zgaruvchisi o'rnatilmagan: ${key}. ` +
        `Uni .env faylida yoki deploy muhitida belgilang.`,
    );
  }
  return value;
}
