import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCourseDto {
  @ApiProperty({ example: "JavaScript boshlang‘ich" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: "Frontend yo‘nalishidagi kurs" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  categoryId!: number;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: "Yangilangan sarlavha" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;
}

export class CreateCategoryDto {
  @ApiProperty({ example: "Frontend" })
  @IsString()
  name!: string;
}
