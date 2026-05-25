import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "shahzod" })
  @IsString()
  username!: string;

  @ApiProperty({ example: "secret123", minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}
