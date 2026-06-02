import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Internship } from "./internship.entity";
import {
  ApplicationStatus,
  InternshipApplication,
} from "./internship-application.entity";
import { User } from "../users/user.entity";
import {
  CreateInternshipDto,
  UpdateInternshipDto,
} from "./dto/internship.dto";
import { AuthenticatedUser, Role } from "../common/interfaces/jwt-payload.interface";

// Bu rollar amaliyot kontentiga arizasiz kira oladi.
const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "MENTOR"];

export interface ApplicationView {
  id: number;
  internshipId: number;
  userId: string;
  status: ApplicationStatus;
  motivation: string | null;
  rejectReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; username: string; email: string };
  internship?: { id: number; title: string };
}

@Injectable()
export class InternshipService {
  constructor(
    @InjectRepository(Internship)
    private readonly internships: Repository<Internship>,
    @InjectRepository(InternshipApplication)
    private readonly applications: Repository<InternshipApplication>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ===== Amaliyotlar (admin CRUD) =====

  async createInternship(dto: CreateInternshipDto): Promise<Internship> {
    return this.internships.save(this.internships.create(dto));
  }

  async updateInternship(
    id: number,
    dto: UpdateInternshipDto,
  ): Promise<Internship> {
    const internship = await this.internships.findOne({ where: { id } });
    if (!internship) throw new NotFoundException("Amaliyot topilmadi");
    Object.assign(internship, dto);
    return this.internships.save(internship);
  }

  async removeInternship(id: number): Promise<void> {
    const internship = await this.internships.findOne({ where: { id } });
    if (!internship) throw new NotFoundException("Amaliyot topilmadi");
    await this.internships.remove(internship);
  }

  async listInternships(): Promise<Internship[]> {
    return this.internships.find({ order: { createdAt: "DESC" } });
  }

  // Talabalar uchun — faqat ochiq amaliyotlar.
  async listOpenInternships(): Promise<Internship[]> {
    return this.internships.find({
      where: { isOpen: true },
      order: { createdAt: "DESC" },
    });
  }

  async getInternship(id: number): Promise<Internship> {
    const internship = await this.internships.findOne({ where: { id } });
    if (!internship) throw new NotFoundException("Amaliyot topilmadi");
    return internship;
  }

  // ===== Arizalar =====

  async apply(
    internshipId: number,
    userId: string,
    motivation: string | null,
  ): Promise<ApplicationView> {
    const internship = await this.internships.findOne({
      where: { id: internshipId },
    });
    if (!internship) throw new BadRequestException("Amaliyot topilmadi");
    if (!internship.isOpen) {
      throw new BadRequestException("Bu amaliyotga ariza qabuli yopilgan");
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException("Foydalanuvchi topilmadi");

    const existing = await this.applications.findOne({
      where: { userId, internshipId },
    });
    if (existing) {
      throw new BadRequestException(
        "Siz bu amaliyotga allaqachon ariza bergansiz",
      );
    }

    // Holatni doim PENDING qilib yaratamiz — mijoz status yubora olmaydi.
    const saved = await this.applications.save(
      this.applications.create({
        internshipId,
        userId,
        motivation: motivation ?? null,
        status: "PENDING",
      }),
    );
    return this.toView(saved, user, internship);
  }

  async listMyApplications(userId: string): Promise<ApplicationView[]> {
    const items = await this.applications.find({
      where: { userId },
      relations: ["internship"],
      order: { createdAt: "DESC" },
    });
    return items.map((a) => this.toView(a, undefined, a.internship));
  }

  // Admin/mentor — status bo'yicha filtrlangan arizalar ro'yxati.
  async listApplications(
    status?: ApplicationStatus,
    internshipId?: number,
  ): Promise<ApplicationView[]> {
    const items = await this.applications.find({
      where: {
        ...(status ? { status } : {}),
        ...(internshipId ? { internshipId } : {}),
      },
      relations: ["user", "internship"],
      order: { createdAt: "DESC" },
    });
    return items.map((a) => this.toView(a, a.user, a.internship));
  }

  async approve(
    applicationId: number,
    actorId: string,
  ): Promise<ApplicationView> {
    const app = await this.getPendingApplication(applicationId);

    // Capacity tekshiruvi — tasdiqlanganlar soni chegaradan oshmasin.
    const internship = await this.internships.findOne({
      where: { id: app.internshipId },
    });
    if (internship?.capacity != null) {
      const approvedCount = await this.applications.count({
        where: { internshipId: app.internshipId, status: "APPROVED" },
      });
      if (approvedCount >= internship.capacity) {
        throw new BadRequestException(
          "Amaliyot bo'yicha joylar to'lgan (capacity limit)",
        );
      }
    }

    app.status = "APPROVED";
    app.reviewedById = actorId;
    app.reviewedAt = new Date();
    app.rejectReason = null;
    const saved = await this.applications.save(app);
    return this.toView(saved);
  }

  async reject(
    applicationId: number,
    actorId: string,
    reason: string | null,
  ): Promise<ApplicationView> {
    const app = await this.getPendingApplication(applicationId);
    app.status = "REJECTED";
    app.reviewedById = actorId;
    app.reviewedAt = new Date();
    app.rejectReason = reason ?? null;
    const saved = await this.applications.save(app);
    return this.toView(saved);
  }

  /**
   * Foydalanuvchi amaliyot kontentiga kira olishini ta'minlaydi.
   * Admin/mentor har doim; talaba esa faqat arizasi APPROVED bo'lsa.
   */
  async assertCanAccessInternship(
    user: AuthenticatedUser,
    internshipId: number,
  ): Promise<void> {
    if (STAFF_ROLES.includes(user.role)) return;
    const count = await this.applications.count({
      where: { userId: user.id, internshipId, status: "APPROVED" },
    });
    if (count === 0) {
      throw new ForbiddenException("Siz bu amaliyotga qabul qilinmagansiz");
    }
  }

  // Faqat PENDING holatdagi arizani ikki marta ko'rib chiqmaslik uchun.
  private async getPendingApplication(
    applicationId: number,
  ): Promise<InternshipApplication> {
    const app = await this.applications.findOne({
      where: { id: applicationId },
      relations: ["user", "internship"],
    });
    if (!app) throw new NotFoundException("Ariza topilmadi");
    if (app.status !== "PENDING") {
      throw new BadRequestException(
        `Ariza allaqachon ko'rib chiqilgan (${app.status})`,
      );
    }
    return app;
  }

  private toView(
    a: InternshipApplication,
    user?: User,
    internship?: Internship,
  ): ApplicationView {
    const u = user ?? a.user;
    const i = internship ?? a.internship;
    return {
      id: a.id,
      internshipId: a.internshipId,
      userId: a.userId,
      status: a.status,
      motivation: a.motivation,
      rejectReason: a.rejectReason,
      reviewedById: a.reviewedById,
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      user: u ? { id: u.id, username: u.username, email: u.email } : undefined,
      internship: i ? { id: i.id, title: i.title } : undefined,
    };
  }
}
