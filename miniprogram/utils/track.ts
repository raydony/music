import type { TrackListItem, TrackView } from '../types/track';
import { formatDuration } from './duration';

export function toTrackView(track: TrackListItem): TrackView {
  return {
    ...track,
    durationLabel: formatDuration(track.duration),
  };
}
