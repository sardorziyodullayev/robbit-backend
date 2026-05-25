import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  repo() {
    return this.users;
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async getById(id: string): Promise<User> {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    return u;
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }

  create(partial: Partial<User>): User {
    return this.users.create(partial);
  }
}
