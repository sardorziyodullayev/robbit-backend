import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";

export class CreateEnrollmentDto {
  @ApiProperty({ example: 1, description: "Kurs ID" })
  @IsInt()
  courseId!: number;

  @ApiProperty({
    example: "b3b1...uuid",
    description: "Kursga yoziladigan talaba (User) ID",
  })
  @IsString()
  userId!: string;
}
