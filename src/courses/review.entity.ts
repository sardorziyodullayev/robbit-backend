import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Course } from "./course.entity";

@Entity({ name: "reviews" })
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  rating!: number;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  courseId!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
