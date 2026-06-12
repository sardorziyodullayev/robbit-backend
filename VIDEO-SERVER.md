# Kurs videolarini serverga yuklash — sozlash yo'riqnomasi

Video yuklash kodi backend'da tayyor (`POST /lessons/:id/video`, admin paneldagi
"Video yuklash" formasi shu endpoint'ga yuboradi). Faqat **fayllar qayerda
saqlanishini** sozlash kerak.

## Muammo nimada?

Render (free plan) diskdagi fayllarni **saqlamaydi** — har deploy/restart'da
`./uploads` papkasi o'chib ketadi. Shuning uchun videolarni tashqi object
storage'ga (Cloudflare R2) qo'yish kerak. Backend buni allaqachon qo'llab-quvvatlaydi:
R2 env o'zgaruvchilari berilsa R2'ga, berilmasa lokal diskka yozadi
(`src/common/storage/storage.service.ts`).

## Cloudflare R2 sozlash (bepul: 10 GB)

1. https://dash.cloudflare.com → **R2 Object Storage** → "Create bucket".
   Nom masalan: `robbit-videos`.

2. Bucket → **Settings → Public access** → "Allow public access" yoqing
   (yoki o'z domeningizni ulang). Berilgan `https://pub-xxxx.r2.dev` manzilini
   yozib oling — bu `R2_PUBLIC_URL` bo'ladi.

3. R2 bosh sahifasida → **Manage R2 API Tokens** → "Create API Token":
   - Permission: **Object Read & Write**, bucket: `robbit-videos`
   - Berilgan `Access Key ID` va `Secret Access Key`ni yozib oling.
   - `Account ID` Cloudflare dashboard URL'ida/o'ng panelda ko'rinadi.

4. Render dashboard → `robbit-backend` service → **Environment** bo'limiga
   quyidagilarni kiriting (render.yaml'da joylari tayyor, `sync: false`):

   ```
   R2_ACCOUNT_ID=<account id>
   R2_ACCESS_KEY_ID=<access key id>
   R2_SECRET_ACCESS_KEY=<secret access key>
   R2_BUCKET=robbit-videos
   R2_PUBLIC_URL=https://pub-xxxx.r2.dev
   ```

5. Service'ni **Restart/Deploy** qiling. Log'da
   `R2 storage enabled (bucket: robbit-videos)` chiqsa — tayyor.
   (`R2 not configured — falling back to local disk storage` chiqsa, env
   o'zgaruvchilardan bittasi yetishmayapti.)

Shundan keyin admin paneldan yuklangan video R2'ga tushadi, darsda esa
`https://pub-xxxx.r2.dev/lesson-<uuid>.mp4` URL orqali o'ynaydi. Kurs
rasmlari (thumbnail) va avatarlar ham xuddi shu storage'ga tushadi.

## Video qo'yishning ikki usuli (admin panelda)

Dars formasida endi ikkala variant ham bor:

1. **Video havolasi** (tavsiya etiladi, ayniqsa katta videolar uchun):
   videoni R2'ga qo'lda yuklab (yoki istalgan joyga), public havolasini
   "Video havolasi" maydoniga qo'ying. Hech qanday API kalit shart emas,
   server xotirasiga yuk tushmaydi.

2. **To'g'ridan-to'g'ri yuklash** (Cloudflare'ga kirmasdan): "Video yuklash"
   tugmasidan fayl tanlaysiz → backend uni avtomatik R2'ga yuklaydi va URL'ni
   saqlaydi. Buning uchun yuqoridagi `R2_*` env kalitlari kerak. **Cheklov:**
   Render free instance RAM ~512 MB, yuklash xotira orqali o'tadi — shuning
   uchun bu usul ~100–150 MB gacha videolar uchun ishonchli. Kattaroq video
   bo'lsa 1-usulni (havola) ishlating.

## Frontendda ko'rinishi (student tomoni)

Frontend dars sahifasi endi avval backenddan darslarni oladi
(`src/services/lessons.ts`), shuning uchun admin panelda qo'shilgan darslar va
videolar studentга ko'rinadi. Ikki shart:
- **Kurs nomi mosligi**: frontend statik kurslari (`data/courses.ts`) backend
  kursiga sarlavha bo'yicha bog'lanadi. Admin panelda kursni o'xshash nom bilan
  yarating (masalan "Scratch ..."). Mos kelmasa frontend statik darslarga tushadi.
- **Enrollment**: student kursni ko'rishi uchun unga yozilgan bo'lishi kerak
  (admin panel → foydalanuvchini kursga yozish). Admin/mentor har doim ko'radi.
  Yozilmagan student backend darslarini ko'rmaydi (statik mock chiqadi).

## Muhim cheklov: video hajmi

Yuklash hozir xotira (RAM) orqali o'tadi, Render free instance'da esa ~512 MB
RAM bor. Shuning uchun **bitta video ~100–150 MB dan oshmasin** (kod limiti
500 MB bo'lsa ham, katta faylda server xotirasi yetmay qolishi mumkin).
Katta videolar kerak bo'lsa variantlar:
- Render planini kattaroqqa o'tkazish;
- Videoni siqib (720p, H.264) yuklash — o'quv video uchun yetarli;
- Yoki videoni YouTube (unlisted)/Vimeo'ga qo'yib, darsga URL sifatida berish
  (lesson'ning `videoUrl` maydoni PATCH /lessons/:id orqali to'g'ridan-to'g'ri
  URL qabul qiladi).

## Admin login serverda

- `render.yaml`da `SEED_ON_START=true`, `ADMIN_USERNAME=admin` bor;
  `ADMIN_PASSWORD`ni Render dashboard → Environment'da kiriting.
- Seed endi har ishga tushishda admin parolini env'dagi qiymat bilan
  **sinxronlaydi** — ya'ni Render'da `ADMIN_PASSWORD`ni o'zgartirib restart
  qilsangiz, login har doim shu parol bilan ishlaydi.
- Admin panel build'i (`npm run build`) endi `.env.production` orqali
  `https://robbit-backend.onrender.com`ga ulanadi.
