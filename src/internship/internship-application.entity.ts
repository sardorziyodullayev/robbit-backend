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
import { Internship } from "./internship.entity";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

@Entity({ name: "internship_applications" })
// Bir talaba bitta amaliyotga faqat bir marta ariza bera oladi.
@Index(["userId", "internshipId"], { unique: true })
export class InternshipApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Internship, { onDelete: "CASCADE" })
  @JoinColumn({ name: "internshipId" })
  internship!: Internship;

  @Column()
  internshipId!: number;

  @Column({ type: "varchar", default: "PENDING" })
  status!: ApplicationStatus;

  // Talabaning ariza berishdagi izohi/motivatsiyasi.
  @Column({ type: "text", nullable: true })
  motivation!: string | null;

  // Qaysi admin/mentor ko'rib chiqdi (audit uchun).
  @Column({ type: "varchar", nullable: true })
  reviewedById!: string | null;

  // Rad etilgan bo'lsa — sababi.
  @Column({ type: "varchar", nullable: true })
  rejectReason!: string | null;

  // `type: Date` — TypeORM uni drayverga qarab normallashtiradi:
  // postgres → "timestamp", sqlite → "datetime" (ikkalasida ham ishlaydi).
  @Column({ type: Date, nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
