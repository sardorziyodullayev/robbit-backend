# robbit_backend — Ish jurnali

> NestJS 10 + TypeORM 0.3 + Passport JWT. Lokal: SQLite (`better-sqlite3`),
> Prod: PostgreSQL (Render). Port 4000. Swagger: `/api/docs`.

## Texnik eslatmalar (keyingi safar uchun)
- TypeORM `synchronize` (`DB_SYNC`) yoqilgan — entity o'zgartirsang baza avtomatik
  yangilanadi, migration yo'q.
- Ishga tushirish: `npm run start:dev` (watch) yoki `npm run build && node dist/main.js`.
- Lokalda SQLite bilan sinash:
  ```
  DB_DRIVER=sqlite DB_PATH=./robbit.sqlite DB_SYNC=true SEED_ON_START=true \
  PORT=4000 JWT_ACCESS_SECRET=x JWT_REFRESH_SECRET=y \
  ADMIN_USERNAME=admin ADMIN_PASSWORD=Admin@123 PUBLIC_URL=http://localhost:4000 \
  node dist/main.js
  ```
- Fayl saqlash: `src/common/storage/storage.service.ts` — R2 env'lari bo'lsa
  Cloudflare R2'ga, bo'lmasa lokal `./uploads`ga. Video/thumbnail/avatar shu yerdan.
- Typecheck: `npm run typecheck`. Build: `npm run build`.

## 2026-06-12 o'zgarishlar

### 1. Admin parol sinxronizatsiyasi — `src/seed/seed.service.ts`
`ensureAdmin()` qayta yozildi. Avval: admin mavjud bo'lsa hech nima qilmas edi
(env'da parol o'zgarsa eski parol qolar edi — serverda login muammosi shu edi).
Endi: admin mavjud bo'lsa ham `bcrypt.compare` bilan parolni tekshiradi va
mos kelmasa env qiymati bilan yangilaydi (rol/isActive ham). `SEED_ON_START=true`
shart.

### 2. Test-history javobiga kurs ma'lumoti — `src/profile/profile.service.ts`
`TestHistoryItemView` interfeysiga `courseId`, `courseThumbnail` qo'shildi.
`testHistory()` da `courseMap`'dan `c.thumbnail` qaytariladi.

### 3. Admin user avatar — `src/admin/admin.controller.ts` + `admin.service.ts`
Yangi endpointlar:
- `POST /admin/users/:id/avatar` (multipart, 10MB) → `uploadUserAvatar()`
- `DELETE /admin/users/:id/avatar` → `deleteUserAvatar()`
`AdminService`'ga `StorageService` inject qilindi (avatar yuklash uchun).

### 4. `VIDEO-SERVER.md` yaratildi
Render'da video uchun Cloudflare R2 sozlash yo'riqnomasi.

### 5. Darsga video URL (havola) qo'yish — `src/lessons/dto/lesson.dto.ts` + `lessons.service.ts`
`CreateLessonDto` va `UpdateLessonDto` ga `videoUrl?: string` qo'shildi.
`create()`/`update()` endi `videoUrl`ni saqlaydi. Shu bilan admin paneldan
ikki yo'l bilan video qo'yiladi: (a) havola qo'yish (qo'lda R2'ga yuklab),
(b) fayl tanlab `POST /lessons/:id/video` orqali backend R2'ga yuklaydi
(StorageService — R2 env'lari bo'lsa R2'ga). `.env` ga R2 placeholder'lari
qo'shildi (`R2_PUBLIC_URL` to'ldirilgan, qolgan 4 tasi bo'sh — VIDEO-SERVER.md).

## Sinov natijasi (2026-06-12)
Lokal SQLite copy'da ishga tushirildi (port 4199):
- `POST /auth/login` admin → 200, SUPER_ADMIN token ✅
- `POST /tests` (test yaratish) → ✅
- `POST /tests/:id/submit` → ✅ (score/percent to'g'ri)
- `GET /profile/me/test-history` → `courseId`, `courseTitle`, `courseThumbnail` qaytdi ✅
- `GET /tests/attempts/:id` → ✅

## Tuzilma (asosiy modullar)
`auth, users, profile, courses, lessons, tests, ai, admin, enrollment,
internship, seed, health` + `common/` (guards, storage, strategies).

## Ochiq ishlar
- Backend tomonida hammasi to'liq ishlaydi. Asosiy ish frontendni backendga
  to'liqroq ulashda (darslar, quiz courseId) — yuqori `../PROGRESS.md` ga qara.
