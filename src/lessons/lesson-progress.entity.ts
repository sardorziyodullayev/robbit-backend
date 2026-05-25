import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lesson } from "./lesson.entity";
import { User } from "../users/user.entity";

@Entity({ name: "lesson_progress" })
@Index(["userId", "lessonId"], { unique: true })
export class LessonProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Lesson, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @Column()
  lessonId!: number;

  @CreateDateColumn()
  completedAt!: Date;
}
