import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'node:http';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

process.env.JWT_SECRET = 'e2e-only-jwt-secret-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '12h';

const ids = {
  artists: {
    wutai: '10000000-0000-4000-8000-000000000001',
    musician: '10000000-0000-4000-8000-000000000002',
  },
  categories: {
    fanbai: '20000000-0000-4000-8000-000000000001',
    zanji: '20000000-0000-4000-8000-000000000002',
  },
  albums: {
    wutai: '30000000-0000-4000-8000-000000000001',
    general: '30000000-0000-4000-8000-000000000002',
  },
  tracks: {
    published: '40000000-0000-4000-8000-000000000001',
    unpublished: '40000000-0000-4000-8000-000000000002',
  },
} as const;

const nonexistentId = '99999999-9999-4999-8999-999999999999';
const testAdmin = {
  username: 'E2E-auth-admin',
  password: 'E2E-Strong-Password-123',
  inactiveUsername: 'E2E-auth-inactive',
} as const;

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PageEnvelope<T> extends ApiEnvelope<T[]> {
  meta: PageMeta;
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
  timestamp: string;
  path: string;
}

interface TrackItem {
  id: string;
  title: string;
  isPublished?: boolean;
  lyrics?: string | null;
  lyricsLrc?: string | null;
}

interface AlbumDetails {
  id: string;
  tracks: TrackItem[];
}

interface ArtistDetails {
  id: string;
  albums: Array<{ id: string; publishedTrackCount: number }>;
  publishedTrackCount: number;
}

describe('Music catalog API (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let httpServer: Server;
  let adminToken: string;
  let expiredAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    await prisma.adminUser.deleteMany({ where: { username: { startsWith: 'E2E-auth-' } } });
    const passwordHash = await hash(testAdmin.password, 4);
    await prisma.adminUser.createMany({
      data: [
        { username: testAdmin.username, passwordHash },
        { username: testAdmin.inactiveUsername, passwordHash, isActive: false },
      ],
    });
    const activeAdmin = await prisma.adminUser.findUniqueOrThrow({
      where: { username: testAdmin.username },
    });
    expiredAdminToken = app
      .get(JwtService)
      .sign({ sub: activeAdmin.id, username: activeAdmin.username }, { expiresIn: -1 });

    const loginResponse = await request(httpServer).post('/api/admin/auth/login').send({
      username: testAdmin.username,
      password: testAdmin.password,
    });
    adminToken = (loginResponse.body as ApiEnvelope<{ accessToken: string }>).data.accessToken;
  });

  afterAll(async () => {
    if (!prisma || !app) {
      return;
    }
    await prisma.track.deleteMany({ where: { title: { startsWith: 'E2E-' } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: 'E2E-' } } });
    await prisma.album.deleteMany({ where: { title: { startsWith: 'E2E-' } } });
    await prisma.artist.deleteMany({ where: { name: { startsWith: 'E2E-' } } });
    await prisma.adminUser.deleteMany({ where: { username: { startsWith: 'E2E-auth-' } } });
    await app.close();
  });

  describe('global behavior', () => {
    it('wraps a successful health response', async () => {
      await request(httpServer)
        .get('/api/health')
        .expect(200)
        .expect({ success: true, data: { status: 'ok' } });
    });

    it('rejects unknown query properties', async () => {
      const response = await request(httpServer).get('/api/tracks?unknown=value').expect(400);
      const body = response.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body).not.toHaveProperty('stack');
      expect(body.path).toBe('/api/tracks?unknown=value');
    });
  });

  describe('public tracks', () => {
    it('returns a paginated list containing only published compact tracks', async () => {
      const response = await request(httpServer).get('/api/tracks?page=1&pageSize=2').expect(200);
      const body = response.body as PageEnvelope<TrackItem>;

      expect(body.success).toBe(true);
      expect(body.meta).toMatchObject({ page: 1, pageSize: 2 });
      expect(body.meta.total).toBeGreaterThanOrEqual(4);
      expect(body.meta.totalPages).toBe(Math.ceil(body.meta.total / body.meta.pageSize));
      expect(body.data).toHaveLength(2);
      expect(body.data.some((track) => track.id === ids.tracks.unpublished)).toBe(false);
      expect(body.data.every((track) => !('lyrics' in track) && !('lyricsLrc' in track))).toBe(
        true,
      );
    });

    it('returns a published track detail', async () => {
      const response = await request(httpServer)
        .get(`/api/tracks/${ids.tracks.published}`)
        .expect(200);
      const body = response.body as ApiEnvelope<TrackItem>;
      expect(body.data.id).toBe(ids.tracks.published);
      expect(body.data).toHaveProperty('lyricsLrc');
    });

    it('treats an unpublished track as not found', async () => {
      const response = await request(httpServer)
        .get(`/api/tracks/${ids.tracks.unpublished}`)
        .expect(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('TRACK_NOT_FOUND');
    });

    it('rejects an invalid UUID before querying', async () => {
      const response = await request(httpServer).get('/api/tracks/abc').expect(400);
      expect((response.body as ErrorEnvelope).error.code).toBe('VALIDATION_ERROR');
    });

    it('returns not found for an absent valid UUID', async () => {
      const response = await request(httpServer).get(`/api/tracks/${nonexistentId}`).expect(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('TRACK_NOT_FOUND');
    });
  });

  describe('public albums', () => {
    it('returns a paginated album list', async () => {
      const response = await request(httpServer).get('/api/albums').expect(200);
      const body = response.body as PageEnvelope<{ id: string }>;
      expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
      expect(body.data).toHaveLength(2);
    });

    it('does not expose unpublished tracks in album details', async () => {
      const response = await request(httpServer).get(`/api/albums/${ids.albums.wutai}`).expect(200);
      const body = response.body as ApiEnvelope<AlbumDetails>;
      expect(body.data.tracks.map((track) => track.id)).not.toContain(ids.tracks.unpublished);
      expect(body.data.tracks).toHaveLength(2);
    });
  });

  describe('public artists', () => {
    it('returns a paginated artist list', async () => {
      const response = await request(httpServer).get('/api/artists').expect(200);
      const body = response.body as PageEnvelope<{ id: string }>;
      expect(body.meta.total).toBe(2);
      expect(body.data).toHaveLength(2);
    });

    it('returns bounded artist details with albums and track count', async () => {
      const response = await request(httpServer)
        .get(`/api/artists/${ids.artists.wutai}`)
        .expect(200);
      const body = response.body as ApiEnvelope<ArtistDetails>;
      expect(body.data.albums).toHaveLength(1);
      expect(body.data.publishedTrackCount).toBeGreaterThanOrEqual(2);
      expect(body.data).not.toHaveProperty('tracks');
    });
  });

  describe('public categories', () => {
    it('returns all categories', async () => {
      const response = await request(httpServer).get('/api/categories').expect(200);
      const body = response.body as ApiEnvelope<Array<{ id: string }>>;
      expect(body.data).toHaveLength(5);
    });

    it('paginates category tracks and includes only published tracks', async () => {
      const response = await request(httpServer)
        .get(`/api/categories/${ids.categories.fanbai}/tracks?page=1&pageSize=20`)
        .expect(200);
      const body = response.body as PageEnvelope<TrackItem>;
      expect(body.meta.total).toBe(1);
      expect(body.data.map((track) => track.id)).not.toContain(ids.tracks.unpublished);
    });
  });

  describe('admin authentication', () => {
    it('logs in with correct credentials without exposing the password hash', async () => {
      const response = await request(httpServer)
        .post('/api/admin/auth/login')
        .send({ username: testAdmin.username, password: testAdmin.password })
        .expect(200);
      const body = response.body as ApiEnvelope<{
        accessToken: string;
        admin: { id: string; username: string };
      }>;

      expect(body.data.accessToken).toEqual(expect.any(String));
      expect(body.data.admin.username).toBe(testAdmin.username);
      expect(body.data.admin).not.toHaveProperty('passwordHash');
    });

    it('rejects an incorrect password without identifying the failure reason', async () => {
      const response = await request(httpServer)
        .post('/api/admin/auth/login')
        .send({ username: testAdmin.username, password: 'Wrong-Password-123' })
        .expect(401);

      expect((response.body as ErrorEnvelope).error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      });
    });

    it('rejects an unknown username with the same response', async () => {
      const response = await request(httpServer)
        .post('/api/admin/auth/login')
        .send({ username: 'E2E-auth-unknown', password: 'Wrong-Password-123' })
        .expect(401);

      expect((response.body as ErrorEnvelope).error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      });
    });

    it('rejects an inactive administrator', async () => {
      await request(httpServer)
        .post('/api/admin/auth/login')
        .send({ username: testAdmin.inactiveUsername, password: testAdmin.password })
        .expect(401);
    });

    it('rejects /admin/auth/me without a token', async () => {
      await request(httpServer).get('/api/admin/auth/me').expect(401);
    });

    it('returns the current administrator for a valid token', async () => {
      const response = await request(httpServer)
        .get('/api/admin/auth/me')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect((response.body as ApiEnvelope<{ username: string }>).data.username).toBe(
        testAdmin.username,
      );
    });

    it('rejects an expired token', async () => {
      await request(httpServer)
        .get('/api/admin/auth/me')
        .auth(expiredAdminToken, { type: 'bearer' })
        .expect(401);
    });

    it('protects Admin APIs while leaving Public APIs open', async () => {
      await request(httpServer).get('/api/admin/tracks').expect(401);
      await request(httpServer)
        .get('/api/admin/tracks')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
      await request(httpServer).get('/api/tracks').expect(200);
    });
  });

  describe('admin track CRUD and validation', () => {
    let trackId: string;

    it('creates a draft track', async () => {
      const response = await request(httpServer)
        .post('/api/admin/tracks')
        .auth(adminToken, { type: 'bearer' })
        .send({
          title: '  E2E-测试曲目  ',
          artistId: ids.artists.musician,
          albumId: ids.albums.general,
          categoryId: ids.categories.fanbai,
          audioUrl: 'https://example.com/audio/e2e.mp3',
          duration: 60,
          trackNumber: 99,
        })
        .expect(201);
      const body = response.body as ApiEnvelope<TrackItem>;
      trackId = body.data.id;
      expect(body.data.title).toBe('E2E-测试曲目');
      expect(body.data.isPublished).toBe(false);
    });

    it('gets, updates, and deletes the track', async () => {
      await request(httpServer)
        .get(`/api/admin/tracks/${trackId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const updated = await request(httpServer)
        .patch(`/api/admin/tracks/${trackId}`)
        .auth(adminToken, { type: 'bearer' })
        .send({ title: 'E2E-已更新曲目', isPublished: true })
        .expect(200);
      expect((updated.body as ApiEnvelope<TrackItem>).data.title).toBe('E2E-已更新曲目');

      await request(httpServer)
        .delete(`/api/admin/tracks/${trackId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
      await request(httpServer)
        .get(`/api/admin/tracks/${trackId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });

    it.each([
      ['negative duration', { duration: -1 }, 'duration must not be less than 0'],
      ['invalid audio URL', { audioUrl: 'not-a-url' }, 'audioUrl must be a URL address'],
      ['invalid artist UUID', { artistId: 'bad-id' }, 'artistId must be a UUID'],
    ])('rejects %s', async (_label, override, expectedMessage) => {
      const response = await request(httpServer)
        .post('/api/admin/tracks')
        .auth(adminToken, { type: 'bearer' })
        .send({
          title: 'E2E-invalid',
          artistId: ids.artists.musician,
          categoryId: ids.categories.fanbai,
          audioUrl: 'https://example.com/audio/e2e.mp3',
          duration: 60,
          ...override,
        })
        .expect(400);
      expect((response.body as ErrorEnvelope).error.message).toContain(expectedMessage);
    });

    it('returns 404 for a nonexistent related artist', async () => {
      const response = await request(httpServer)
        .post('/api/admin/tracks')
        .auth(adminToken, { type: 'bearer' })
        .send({
          title: 'E2E-missing-artist',
          artistId: nonexistentId,
          categoryId: ids.categories.fanbai,
          audioUrl: 'https://example.com/audio/e2e.mp3',
          duration: 60,
        })
        .expect(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('ARTIST_NOT_FOUND');
    });

    it('rejects an album and artist mismatch', async () => {
      const response = await request(httpServer)
        .post('/api/admin/tracks')
        .auth(adminToken, { type: 'bearer' })
        .send({
          title: 'E2E-mismatch',
          artistId: ids.artists.wutai,
          albumId: ids.albums.general,
          categoryId: ids.categories.fanbai,
          audioUrl: 'https://example.com/audio/e2e.mp3',
          duration: 60,
        })
        .expect(400);
      expect((response.body as ErrorEnvelope).error.code).toBe('ALBUM_ARTIST_MISMATCH');
    });
  });

  describe('admin conflict mapping', () => {
    it('returns 409 for a duplicate category name', async () => {
      const response = await request(httpServer)
        .post('/api/admin/categories')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: '梵呗' })
        .expect(409);
      expect((response.body as ErrorEnvelope).error.code).toBe('CATEGORY_NAME_EXISTS');
    });

    it('returns 409 when deleting a category in use', async () => {
      const response = await request(httpServer)
        .delete(`/api/admin/categories/${ids.categories.zanji}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(409);
      expect((response.body as ErrorEnvelope).error.code).toBe('CATEGORY_IN_USE');
    });

    it('returns 409 when deleting an artist in use', async () => {
      const response = await request(httpServer)
        .delete(`/api/admin/artists/${ids.artists.wutai}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(409);
      expect((response.body as ErrorEnvelope).error.code).toBe('ARTIST_IN_USE');
    });
  });
});
