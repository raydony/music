import type { Prisma } from '../../generated/prisma/client.js';

export const artistSummarySelect = {
  id: true,
  name: true,
  type: true,
} satisfies Prisma.ArtistSelect;

export const albumSummarySelect = {
  id: true,
  title: true,
} satisfies Prisma.AlbumSelect;

export const categorySummarySelect = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

export const trackListSelect = {
  id: true,
  title: true,
  subtitle: true,
  audioUrl: true,
  coverUrl: true,
  duration: true,
  trackNumber: true,
  artist: { select: artistSummarySelect },
  album: { select: albumSummarySelect },
  category: { select: categorySummarySelect },
} satisfies Prisma.TrackSelect;

export const trackDetailSelect = {
  ...trackListSelect,
  lyrics: true,
  lyricsLrc: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TrackSelect;
