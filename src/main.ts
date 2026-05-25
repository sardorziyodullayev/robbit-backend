import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>("CORS_ORIGIN") ?? "*";
  app.enableCors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Robbit API")
    .setDescription("Robbit LMS backend REST API")
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        in: "header",
        description: "JWT access token",
      },
      "access-token",
    )
    .addTag("Auth", "Ro‘yxatdan o‘tish, kirish, token yangilash")
    .addTag("Profile", "Foydalanuvchi profili va sozlamalari")
    .addTag("Courses", "Kurslar va kategoriyalar")
    .addTag("Lessons", "Darslar va dars progressi")
    .addTag("Tests", "Testlar va urinishlar")
    .addTag("AI", "AI yordamida test generatsiya va baholash")
    .addTag("Admin", "Super admin uchun foydalanuvchi va filiallar boshqaruvi")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = Number(config.get("PORT") ?? 4000);
  await app.listen(port);
  Logger.log(`Robbit backend listening on http://localhost:${port}`, "Bootstrap");
  Logger.log(`Swagger docs: http://localhost:${port}/api/docs`, "Bootstrap");
}

bootstrap();
