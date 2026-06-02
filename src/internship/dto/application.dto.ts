import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApplyInternshipDto {
  @ApiPropertyOptional({
    description: "Talabaning izohi/motivatsiyasi (ixtiyoriy)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivation?: string;
}

export class RejectApplicationDto {
  @ApiPropertyOptional({ description: "Rad etish sababi" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
