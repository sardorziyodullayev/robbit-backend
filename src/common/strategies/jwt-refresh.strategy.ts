import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { AuthenticatedUser, JwtPayload } from "../interfaces/jwt-payload.interface";

export interface RefreshTokenUser extends AuthenticatedUser {
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>("JWT_REFRESH_SECRET") ?? "refresh-secret",
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): RefreshTokenUser {
    const auth = req.get("authorization") ?? "";
    const refreshToken = auth.replace(/^Bearer\s+/i, "").trim();
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      refreshToken,
    };
  }
}
