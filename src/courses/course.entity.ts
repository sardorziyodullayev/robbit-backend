import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./category.entity";

@Entity({ name: "courses" })
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "real", default: 0 })
  price!: number;

  @ManyToOne(() => Category, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "categoryId" })
  category!: Category;

  @Column()
  categoryId!: number;

  @Column({ default: false })
  isPublished!: boolean;

  @Column({ type: "varchar", nullable: true })
  thumbnail!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
