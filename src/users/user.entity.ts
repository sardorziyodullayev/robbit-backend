import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "../admin/branch.entity";
import { Role } from "../common/interfaces/jwt-payload.interface";

export type Gender = "male" | "female";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  username!: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: "varchar", default: "STUDENT" })
  role!: Role;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "varchar", nullable: true })
  firstName!: string | null;

  @Column({ type: "varchar", nullable: true })
  lastName!: string | null;

  @Column({ type: "integer", nullable: true })
  age!: number | null;

  @Column({ type: "varchar", nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", nullable: true })
  gender!: Gender | null;

  @Column({ type: "varchar", nullable: true })
  avatar!: string | null;

  @Column({ type: "text", nullable: true })
  refreshTokenHash!: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: "SET NULL", eager: true })
  @JoinColumn({ name: "branchId" })
  branch!: Branch | null;

  @Column({ type: "varchar", nullable: true })
  branchId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
