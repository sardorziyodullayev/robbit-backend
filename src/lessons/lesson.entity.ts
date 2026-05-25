import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Course } from "../courses/course.entity";

@Entity({ name: "lessons" })
export class Lesson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  courseId!: number;

  @Column({ type: "integer", default: 0 })
  order!: number;

  @Column({ type: "varchar", nullable: true })
  videoUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
