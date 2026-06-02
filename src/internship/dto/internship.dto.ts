import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateInternshipDto {
  @ApiProperty({ example: "Frontend amaliyoti", description: "Amaliyot nomi" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: "Tavsif" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "Robbit IT", description: "Kompaniya nomi" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 10, description: "Qabul chegarasi (null — cheksiz)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: true, description: "Ariza qabul ochiqmi" })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class UpdateInternshipDto extends PartialType(CreateInternshipDto) {}
