import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "shahzod", minLength: 3, maxLength: 40 })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username!: string;

  @ApiProperty({ example: "user@example.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "secret123", minLength: 6, maxLength: 100 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({ description: "Filial (branch) IDsi", example: "uuid-string" })
  @IsOptional()
  @IsString()
  branchId?: string;
}
