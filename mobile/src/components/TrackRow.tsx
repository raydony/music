import type { TrackListItem } from '../api/types';
import { Artwork } from './Artwork';

function durationLabel(duration: number): string {
  if (!Number.isFinite(duration) || duration <= 0) return '—';
  const seconds = Math.round(duration);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TrackRow({
  track,
  index,
  onPlay,
}: {
  track: TrackListItem;
  index?: number;
  onPlay: () => void;
}) {
  return (
    <article className="track-row">
      {index !== undefined && <span className="track-index">{String(index).padStart(2, '0')}</span>}
      <button
        type="button"
        className="track-button"
        onClick={onPlay}
        aria-label={`播放 ${track.title}`}
      >
        <Artwork src={track.coverUrl} alt={track.title} className="track-artwork" />
        <span className="track-copy">
          <span className="track-title" title={track.title}>
            {track.title}
          </span>
          <span className="track-subtitle" title={`${track.artist.name} · ${track.category.name}`}>
            {track.artist.name}
            <span className="dot">·</span>
            {track.category.name}
          </span>
        </span>
        <span className="track-duration">{durationLabel(track.duration)}</span>
        <span className="track-play-icon" aria-hidden="true">
          ▶
        </span>
      </button>
    </article>
  );
}
