import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateLessonDto {
  @ApiProperty({ example: "Birinchi dars" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: "Kirish darsi haqida tavsif" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  courseId!: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, description: "Darsning tartib raqami" })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: "https://pub-xxxx.r2.dev/lesson.mp4",
    description: "Video URL (R2 yoki boshqa joyga qo'lda yuklangan video havolasi)",
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: "https://pub-xxxx.r2.dev/lesson.mp4",
    description: "Video URL (R2 yoki boshqa joyga qo'lda yuklangan video havolasi)",
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
