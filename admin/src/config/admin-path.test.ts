import { describe, expect, it } from 'vitest';
import { adminPathForBase, normalizeAdminBasename } from './admin-path';

describe('Admin deployment paths', () => {
  it('keeps development routes at the site root', () => {
    expect(normalizeAdminBasename('/')).toBe('/');
    expect(adminPathForBase('/', '/login')).toBe('/login');
  });

  it('places production routes below /admin without duplicating the prefix', () => {
    expect(normalizeAdminBasename('/admin/')).toBe('/admin');
    expect(adminPathForBase('/admin/', '/login')).toBe('/admin/login');
    expect(adminPathForBase('/admin/', '/tracks')).toBe('/admin/tracks');
  });
});
