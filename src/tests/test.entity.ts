import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "../courses/course.entity";
import { Lesson } from "../lessons/lesson.entity";
import { Question } from "./question.entity";

@Entity({ name: "tests" })
export class Test {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  courseId!: number;

  @ManyToOne(() => Lesson, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson | null;

  @Column({ type: "integer", nullable: true })
  lessonId!: number | null;

  @OneToMany(() => Question, (q) => q.test, { cascade: true })
  questions!: Question[];

  @CreateDateColumn()
  createdAt!: Date;
}
