import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class GenerateTestDto {
  @ApiProperty({ example: "JavaScript asoslari" })
  @IsString()
  topic!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  courseId!: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, description: "Savollar soni" })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @ApiPropertyOptional({
    enum: ["multiple_choice", "open_ended", "mixed"],
    example: "multiple_choice",
  })
  @IsOptional()
  @IsIn(["multiple_choice", "open_ended", "mixed"])
  type?: "multiple_choice" | "open_ended" | "mixed";
}

export class EvaluateTextDto {
  @ApiProperty({ example: "JavaScript-da `let` va `var` farqi nima?" })
  @IsString()
  question!: string;

  @ApiProperty({ example: "let blok scope, var esa function scope ga ega." })
  @IsString()
  answer!: string;
}

export class EvaluateCodeDto {
  @ApiProperty({ example: "Massivni teskari tartibga keltiruvchi funksiya yozing" })
  @IsString()
  question!: string;

  @ApiProperty({ example: "function reverse(arr){ return arr.reverse(); }" })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ example: "javascript" })
  @IsOptional()
  @IsString()
  language?: string;
}

export class EvaluateImageDto {
  @ApiProperty({ example: "Rasmda nima tasvirlangan?" })
  question!: string;

  @ApiProperty({ type: "string", format: "binary", description: "Rasm fayli" })
  image!: any;
}
