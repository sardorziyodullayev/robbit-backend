# Robbit Backend

NestJS + TypeScript backend for the Robbit LMS frontend (`D:\Dasturlash\Robbit`).

## Tech stack

- **NestJS 10** (modular architecture)
- **TypeORM** with **SQLite** (file-based, zero-config — `robbit.sqlite`)
- **JWT** access + refresh tokens (Passport)
- **Multer** file uploads (lesson video, profile avatar)
- **class-validator** DTO validation

## Setup

```bash
cd D:\Dasturlash\robbit_backend
npm install
npm run start:dev
```

Server runs at `http://localhost:4000`. On first boot, the DB schema is auto-synced and seed data (admin user, sample categories) is inserted.

## Frontend wiring

In the Robbit frontend, create/update `.env`:

```
VITE_API_BASE_URL=http://localhost:4000
```

Then `npm run dev` in `D:\Dasturlash\Robbit`.

## Default admin

After first boot:

- username: `admin`
- password: `Admin@123`

## API surface

All paths are prefixed at the server root (no global `/api` prefix, matching the frontend's axios calls).

- `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` `GET /auth/me`
- `GET /courses` `GET /courses/admin/all` `GET /courses/:id` `GET /courses/categories`
  - `POST /courses` `POST /courses/categories` `PATCH /courses/:id` `DELETE /courses/:id`
  - `PATCH /courses/:id/publish` `PATCH /courses/:id/unpublish`
  - `GET /courses/:id/reviews` `POST /courses/:id/reviews`
- `GET /lessons/course/:courseId` `GET /lessons/:id`
  - `POST /lessons` `PATCH /lessons/:id` `DELETE /lessons/:id`
  - `POST /lessons/:id/progress` `GET /lessons/course/:courseId/progress`
  - `POST /lessons/:id/video` (multipart)
- `GET /tests/course/:courseId` `GET /tests/:id` `GET /tests/:id/with-answers`
  - `POST /tests` `POST /tests/:id/submit` `GET /tests/attempts/:id`
- `GET /profile/me` `PATCH /profile/me` `PATCH /profile/me/password`
  - `POST /profile/me/avatar` `DELETE /profile/me/avatar`
  - `GET /profile/me/test-history` `GET /profile/me/certificates`
- `POST /ai/generate-test` `POST /ai/evaluate/text` `POST /ai/evaluate/code` `POST /ai/evaluate/image`
- `GET /admin/users` `GET /admin/users/:id` `PATCH /admin/users/:id/toggle-active`
  - `PATCH /admin/users/:id/reset-password` `PATCH /admin/users/:id/role` `GET /admin/stats`
  - `GET /admin/branches` `GET /admin/branches/:id` `POST /admin/branches` `PATCH /admin/branches/:id` `DELETE /admin/branches/:id`
