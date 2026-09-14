const adminTokenStorageKey = 'fanyinji_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(adminTokenStorageKey);
}

export function setToken(token: string): void {
  localStorage.setItem(adminTokenStorageKey, token);
}

export function clearToken(): void {
  localStorage.removeItem(adminTokenStorageKey);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
