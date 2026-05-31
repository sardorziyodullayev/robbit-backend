import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Course } from "../courses/course.entity";

@Entity({ name: "enrollments" })
@Index(["userId", "courseId"], { unique: true })
export class Enrollment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  courseId!: number;

  // Kim yozgan (admin/mentor) — audit uchun.
  @Column({ type: "varchar", nullable: true })
  enrolledById!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
