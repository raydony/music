import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ArtistType, PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  artists: {
    wutaiSangha: '10000000-0000-4000-8000-000000000001',
    demoMusician: '10000000-0000-4000-8000-000000000002',
  },
  categories: {
    fanbai: '20000000-0000-4000-8000-000000000001',
    zanji: '20000000-0000-4000-8000-000000000002',
    sutra: '20000000-0000-4000-8000-000000000003',
    mantra: '20000000-0000-4000-8000-000000000004',
    instrumental: '20000000-0000-4000-8000-000000000005',
  },
  albums: {
    wutaiDemo: '30000000-0000-4000-8000-000000000001',
    generalDemo: '30000000-0000-4000-8000-000000000002',
  },
  tracks: {
    incensePraise: '40000000-0000-4000-8000-000000000001',
    threeRefuges: '40000000-0000-4000-8000-000000000002',
    auspiciousVerse: '40000000-0000-4000-8000-000000000003',
    fanbaiDemo: '40000000-0000-4000-8000-000000000004',
    instrumentalDemo: '40000000-0000-4000-8000-000000000005',
  },
} as const;

async function seedArtists() {
  await prisma.artist.upsert({
    where: { id: ids.artists.wutaiSangha },
    update: {
      name: '五台山僧众',
      description: '用于开发环境的示例艺术家数据。',
      type: ArtistType.SANGHA,
    },
    create: {
      id: ids.artists.wutaiSangha,
      name: '五台山僧众',
      description: '用于开发环境的示例艺术家数据。',
      type: ArtistType.SANGHA,
    },
  });

  await prisma.artist.upsert({
    where: { id: ids.artists.demoMusician },
    update: {
      name: '佛教音乐示例艺术家',
      description: '虚构的开发测试艺术家。',
      type: ArtistType.MUSICIAN,
    },
    create: {
      id: ids.artists.demoMusician,
      name: '佛教音乐示例艺术家',
      description: '虚构的开发测试艺术家。',
      type: ArtistType.MUSICIAN,
    },
  });
}

async function seedCategories() {
  const categories = [
    { id: ids.categories.fanbai, name: '梵呗', description: '梵呗类测试分类。' },
    { id: ids.categories.zanji, name: '赞偈', description: '赞偈类测试分类。' },
    { id: ids.categories.sutra, name: '诵经', description: '诵经类测试分类。' },
    { id: ids.categories.mantra, name: '咒语', description: '咒语类测试分类。' },
    {
      id: ids.categories.instrumental,
      name: '佛教器乐',
      description: '佛教器乐类测试分类。',
    },
  ];

  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
    categoryIds.set(category.name, savedCategory.id);
  }

  return categoryIds;
}

async function seedAlbums() {
  await prisma.album.upsert({
    where: { id: ids.albums.wutaiDemo },
    update: {
      title: '五台山佛教音乐示例集',
      coverUrl: 'https://example.com/images/album-wutai-demo.jpg',
      description: '仅用于开发测试的虚构专辑，不代表真实商业发行。',
      artistId: ids.artists.wutaiSangha,
      publishYear: 2026,
    },
    create: {
      id: ids.albums.wutaiDemo,
      title: '五台山佛教音乐示例集',
      coverUrl: 'https://example.com/images/album-wutai-demo.jpg',
      description: '仅用于开发测试的虚构专辑，不代表真实商业发行。',
      artistId: ids.artists.wutaiSangha,
      publishYear: 2026,
    },
  });

  await prisma.album.upsert({
    where: { id: ids.albums.generalDemo },
    update: {
      title: '佛教音乐测试专辑',
      coverUrl: 'https://example.com/images/album-general-demo.jpg',
      description: '仅用于开发测试的虚构专辑。',
      artistId: ids.artists.demoMusician,
      publishYear: 2026,
    },
    create: {
      id: ids.albums.generalDemo,
      title: '佛教音乐测试专辑',
      coverUrl: 'https://example.com/images/album-general-demo.jpg',
      description: '仅用于开发测试的虚构专辑。',
      artistId: ids.artists.demoMusician,
      publishYear: 2026,
    },
  });
}

async function seedTracks(categoryIds: Map<string, string>) {
  const tracks = [
    {
      id: ids.tracks.incensePraise,
      title: '炉香赞（测试）',
      subtitle: '开发测试曲目',
      artistId: ids.artists.wutaiSangha,
      albumId: ids.albums.wutaiDemo,
      categoryId: categoryIds.get('赞偈')!,
      audioUrl: 'https://example.com/audio/test-001.mp3',
      coverUrl: 'https://example.com/images/track-001.jpg',
      duration: 180,
      lyrics: '测试歌词第一句\n测试歌词第二句\n测试歌词第三句',
      lyricsLrc: '[00:00.00]测试歌词第一句\n[00:05.00]测试歌词第二句\n[00:10.00]测试歌词第三句',
      trackNumber: 1,
      isPublished: true,
    },
    {
      id: ids.tracks.threeRefuges,
      title: '三皈依（测试）',
      subtitle: '开发测试曲目',
      artistId: ids.artists.wutaiSangha,
      albumId: ids.albums.wutaiDemo,
      categoryId: categoryIds.get('梵呗')!,
      audioUrl: 'https://example.com/audio/test-002.mp3',
      coverUrl: null,
      duration: 210,
      lyrics: null,
      lyricsLrc: null,
      trackNumber: 2,
      isPublished: false,
    },
    {
      id: ids.tracks.auspiciousVerse,
      title: '吉祥偈（测试）',
      subtitle: '开发测试曲目',
      artistId: ids.artists.wutaiSangha,
      albumId: ids.albums.wutaiDemo,
      categoryId: categoryIds.get('赞偈')!,
      audioUrl: 'https://example.com/audio/test-003.mp3',
      coverUrl: null,
      duration: 160,
      lyrics: null,
      lyricsLrc: null,
      trackNumber: 3,
      isPublished: true,
    },
    {
      id: ids.tracks.fanbaiDemo,
      title: '梵呗示例一',
      subtitle: '开发测试曲目',
      artistId: ids.artists.demoMusician,
      albumId: ids.albums.generalDemo,
      categoryId: categoryIds.get('梵呗')!,
      audioUrl: 'https://example.com/audio/test-004.mp3',
      coverUrl: null,
      duration: 195,
      lyrics: null,
      lyricsLrc: null,
      trackNumber: 1,
      isPublished: true,
    },
    {
      id: ids.tracks.instrumentalDemo,
      title: '佛教器乐示例一',
      subtitle: '开发测试曲目',
      artistId: ids.artists.demoMusician,
      albumId: ids.albums.generalDemo,
      categoryId: categoryIds.get('佛教器乐')!,
      audioUrl: 'https://example.com/audio/test-005.mp3',
      coverUrl: 'https://example.com/images/track-005.jpg',
      duration: 240,
      lyrics: null,
      lyricsLrc: null,
      trackNumber: 2,
      isPublished: true,
    },
  ];

  for (const track of tracks) {
    await prisma.track.upsert({
      where: { id: track.id },
      update: track,
      create: track,
    });
  }
}

async function main() {
  await seedArtists();
  const categoryIds = await seedCategories();
  await seedAlbums();
  await seedTracks(categoryIds);

  const [artistCount, categoryCount, albumCount, trackCount] = await Promise.all([
    prisma.artist.count(),
    prisma.category.count(),
    prisma.album.count(),
    prisma.track.count(),
  ]);

  console.info('Seed completed', { artistCount, categoryCount, albumCount, trackCount });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
