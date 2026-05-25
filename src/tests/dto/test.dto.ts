import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class CreateQuestionDto {
  @ApiProperty({ example: "JavaScript-da `typeof null` qiymati nima?" })
  @IsString()
  text!: string;

  @ApiProperty({ enum: ["multiple_choice", "open_ended", "code"], example: "multiple_choice" })
  @IsString()
  @IsIn(["multiple_choice", "open_ended", "code"])
  type!: "multiple_choice" | "open_ended" | "code";

  @ApiPropertyOptional({ type: [String], example: ["object", "null", "undefined", "string"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ example: "object" })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateTestDto {
  @ApiProperty({ example: "Birinchi modul testi" })
  @IsString()
  title!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  courseId!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  lessonId?: number;

  @ApiPropertyOptional({ type: [CreateQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}

export class AnswerItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  questionId!: number;

  @ApiProperty({ example: "object" })
  @IsString()
  answer!: string;

  @ApiPropertyOptional({ example: 12.5, description: "Sekundlarda" })
  @IsOptional()
  @IsNumber()
  timeTaken?: number;
}

export class SubmitTestDto {
  @ApiProperty({ type: [AnswerItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers!: AnswerItemDto[];

  @ApiPropertyOptional({ example: 120, description: "Umumiy sarflangan vaqt (sekund)" })
  @IsOptional()
  @IsNumber()
  timeTaken?: number;
}
