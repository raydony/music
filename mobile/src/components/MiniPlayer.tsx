import { Link } from 'react-router-dom';
import { Artwork } from './Artwork';
import { usePlayer } from '../player/usePlayer';

export function MiniPlayer() {
  const { manager, state } = usePlayer();
  const track = state.currentTrack;
  if (!track) return null;

  return (
    <aside className="mini-player" aria-label="正在播放">
      <Link className="mini-player-main" to="/player" aria-label={`打开播放页：${track.title}`}>
        <Artwork src={track.coverUrl} alt={track.title} className="mini-artwork" />
        <span className="mini-copy">
          <strong>{track.title}</strong>
          <small
            className={state.error ? 'mini-error' : undefined}
            role={state.error ? 'alert' : undefined}
          >
            {state.error ?? track.artist.name}
          </small>
        </span>
      </Link>
      <button
        type="button"
        aria-label={state.isPlaying ? '暂停' : '播放'}
        onClick={() => (state.isPlaying ? manager.pause() : manager.resume())}
      >
        {state.isPlaying ? 'Ⅱ' : '▶'}
      </button>
      <button type="button" aria-label="下一首" onClick={() => manager.next()}>
        ▷|
      </button>
    </aside>
  );
}
