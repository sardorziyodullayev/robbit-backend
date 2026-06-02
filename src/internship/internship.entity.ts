import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "internships" })
export class Internship {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  // Amaliyot o'tkaziladigan kompaniya/tashkilot nomi.
  @Column({ type: "varchar", nullable: true })
  companyName!: string | null;

  // Qabul qilinadigan talabalar soni chegarasi (null — cheksiz).
  @Column({ type: "integer", nullable: true })
  capacity!: number | null;

  // Ariza qabul qilish ochiqmi.
  @Column({ default: true })
  isOpen!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
