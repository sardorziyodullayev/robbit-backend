export type Role = "SUPER_ADMIN" | "MENTOR" | "STUDENT";

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
}
