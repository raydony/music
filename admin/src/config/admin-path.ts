export function normalizeAdminBasename(base: string): string {
  return base === '/' ? '/' : base.replace(/\/$/, '');
}

export const adminBasename = normalizeAdminBasename(import.meta.env.BASE_URL);

export function adminPathForBase(base: string, path: `/${string}`): string {
  const basename = normalizeAdminBasename(base);
  return basename === '/' ? path : `${basename}${path}`;
}

export function adminPath(path: `/${string}`): string {
  return adminPathForBase(adminBasename, path);
}
