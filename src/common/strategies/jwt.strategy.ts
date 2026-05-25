import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser, JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>("JWT_ACCESS_SECRET") ?? "access-secret",
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
