import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Shahzod" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Mirzayev" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "Toshkent filiali" })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ enum: ["male", "female"] })
  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female";
}

export class ChangePasswordDto {
  @ApiProperty({ example: "oldSecret123", minLength: 6 })
  @IsString()
  @MinLength(6)
  oldPassword!: string;

  @ApiProperty({ example: "newSecret123", minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class TestHistoryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class UploadAvatarDto {
  @ApiProperty({ type: "string", format: "binary", description: "Avatar rasmi" })
  file!: any;
}
