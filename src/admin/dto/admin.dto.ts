import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { Role } from "../../common/interfaces/jwt-payload.interface";

export class AdminReviewListDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: "Izoh matni bo‘yicha izlash" })
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  age?: number;

  @ApiPropertyOptional({ enum: ["male", "female"] })
  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Filial IDsi (null — bog‘lamani uzish)", nullable: true })
  @IsOptional()
  @IsString()
  branchId?: string | null;

  @ApiPropertyOptional({ enum: ["SUPER_ADMIN", "MENTOR", "STUDENT"] })
  @IsOptional()
  @IsIn(["SUPER_ADMIN", "MENTOR", "STUDENT"])
  role?: Role;
}

export class AdminUserListDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ enum: ["SUPER_ADMIN", "MENTOR", "STUDENT"] })
  @IsOptional()
  @IsIn(["SUPER_ADMIN", "MENTOR", "STUDENT"])
  role?: Role;

  @ApiPropertyOptional({ description: "Filial IDsi bo‘yicha filtrlash" })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: "Username yoki email bo‘yicha izlash" })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "newSecret123", minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: ["SUPER_ADMIN", "MENTOR", "STUDENT"], example: "MENTOR" })
  @IsIn(["SUPER_ADMIN", "MENTOR", "STUDENT"])
  role!: Role;
}

export class CreateBranchDto {
  @ApiProperty({ example: "Toshkent filiali" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "Amir Temur ko‘chasi 1" })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: "Yangi nom" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Yangi manzil" })
  @IsOptional()
  @IsString()
  address?: string;
}
