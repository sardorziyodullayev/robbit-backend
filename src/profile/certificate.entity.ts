import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Course } from "../courses/course.entity";

@Entity({ name: "certificates" })
export class Certificate {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Course, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  courseId!: number;

  @Column({ type: "varchar", nullable: true })
  url!: string | null;

  @CreateDateColumn()
  issuedAt!: Date;
}
