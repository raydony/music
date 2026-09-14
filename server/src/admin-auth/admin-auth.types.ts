export interface AdminJwtPayload {
  sub: string;
  username: string;
}

export interface AuthenticatedAdmin {
  id: string;
  username: string;
}
