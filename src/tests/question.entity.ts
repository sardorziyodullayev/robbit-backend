import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Test } from "./test.entity";

export type QuestionType = "multiple_choice" | "open_ended" | "code";

@Entity({ name: "questions" })
export class Question {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  text!: string;

  @Column({ type: "varchar", default: "multiple_choice" })
  type!: QuestionType;

  @Column({ type: "text", nullable: true })
  optionsJson!: string | null;

  @Column({ type: "text", nullable: true })
  correctAnswer!: string | null;

  @Column({ type: "integer", default: 0 })
  order!: number;

  @ManyToOne(() => Test, (t) => t.questions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "testId" })
  test!: Test;

  @Column()
  testId!: number;
}
