import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ArtistType, Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to verify the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const seedIds = {
  artist: '10000000-0000-4000-8000-000000000001',
  category: '20000000-0000-4000-8000-000000000002',
  track: '40000000-0000-4000-8000-000000000001',
} as const;

const rollbackAfterDelete = '__ROLLBACK_AFTER_UNEXPECTED_DELETE__';
const rollbackAfterSetNull = '__ROLLBACK_AFTER_SET_NULL_TEST__';

function hasPrismaCode(error: unknown, expectedCode: string): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code?: unknown }).code === expectedCode;
}

async function verifyRestrictedDelete(
  label: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<unknown>,
) {
  try {
    await prisma.$transaction(async (transaction) => {
      await operation(transaction);
      throw new Error(rollbackAfterDelete);
    });
  } catch (error) {
    if (error instanceof Error && error.message === rollbackAfterDelete) {
      throw new Error(`${label} deletion was not restricted by the database.`, { cause: error });
    }

    if (!hasPrismaCode(error, 'P2003')) {
      throw error;
    }
  }
}

async function verifyAlbumSetNull() {
  let setNullVerified = false;

  try {
    await prisma.$transaction(async (transaction) => {
      const artist = await transaction.artist.create({
        data: {
          name: '__stage2_set_null_artist__',
          type: ArtistType.OTHER,
        },
      });
      const category = await transaction.category.create({
        data: { name: `__stage2_set_null_category_${artist.id}__` },
      });
      const album = await transaction.album.create({
        data: {
          title: '__stage2_set_null_album__',
          artistId: artist.id,
        },
      });
      const track = await transaction.track.create({
        data: {
          title: '__stage2_set_null_track__',
          artistId: artist.id,
          albumId: album.id,
          categoryId: category.id,
          audioUrl: 'https://example.com/audio/delete-strategy-test.mp3',
          duration: 0,
        },
      });

      await transaction.album.delete({ where: { id: album.id } });
      const preservedTrack = await transaction.track.findUniqueOrThrow({
        where: { id: track.id },
      });

      if (preservedTrack.albumId !== null) {
        throw new Error('Deleting an album did not set Track.albumId to null.');
      }

      setNullVerified = true;
      throw new Error(rollbackAfterSetNull);
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === rollbackAfterSetNull)) {
      throw error;
    }
  }

  if (!setNullVerified) {
    throw new Error('Album SetNull verification did not complete.');
  }
}

async function main() {
  const [artistCount, categoryCount, albumCount, trackCount] = await Promise.all([
    prisma.artist.count(),
    prisma.category.count(),
    prisma.album.count(),
    prisma.track.count(),
  ]);

  const relatedTrack = await prisma.track.findUniqueOrThrow({
    where: { id: seedIds.track },
    include: {
      artist: true,
      album: true,
      category: true,
    },
  });

  await verifyRestrictedDelete('Artist', (transaction) =>
    transaction.artist.delete({ where: { id: seedIds.artist } }),
  );
  await verifyRestrictedDelete('Category', (transaction) =>
    transaction.category.delete({ where: { id: seedIds.category } }),
  );
  await verifyAlbumSetNull();

  console.info('Database verification completed', {
    counts: { artistCount, categoryCount, albumCount, trackCount },
    relatedTrack: {
      title: relatedTrack.title,
      artist: relatedTrack.artist.name,
      album: relatedTrack.album?.title ?? null,
      category: relatedTrack.category.name,
    },
    deleteStrategies: {
      artist: 'Restrict verified',
      category: 'Restrict verified',
      album: 'SetNull verified',
    },
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
