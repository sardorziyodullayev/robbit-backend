import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Test } from "./test.entity";
import { User } from "../users/user.entity";

@Entity({ name: "attempts" })
export class Attempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Test, { onDelete: "CASCADE" })
  @JoinColumn({ name: "testId" })
  test!: Test;

  @Column()
  testId!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @Column({ type: "real" })
  score!: number;

  @Column({ type: "real" })
  maxScore!: number;

  @Column({ type: "real" })
  percent!: number;

  @Column({ type: "integer", nullable: true })
  timeTaken!: number | null;

  @Column({ type: "text", nullable: true })
  aiAnalysis!: string | null;

  @Column({ type: "text" })
  detailsJson!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
