import { apiRequest } from './client';

export interface AdminIdentity {
  id: string;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  admin: AdminIdentity;
}

export function loginAdmin(credentials: LoginCredentials): Promise<LoginResult> {
  return apiRequest<LoginResult>('/admin/auth/login', {
    method: 'POST',
    body: credentials,
  });
}

export function getCurrentAdmin(): Promise<AdminIdentity> {
  return apiRequest<AdminIdentity>('/admin/auth/me');
}
