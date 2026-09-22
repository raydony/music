import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAlbum } from '../api/client';
import type { AlbumDetail } from '../api/types';
import { Artwork } from '../components/Artwork';
import { SectionState } from '../components/SectionState';
import { TrackRow } from '../components/TrackRow';
import { usePlayer } from '../player/usePlayer';

function AlbumContent({ id }: { id: string }) {
  const { manager } = usePlayer();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAlbum(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAlbum(result);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : '加载失败，请稍后重试。');
      });
    return () => controller.abort();
  }, [id, retryKey]);

  const retry = () => {
    setError(null);
    setRetryKey((value) => value + 1);
  };

  return (
    <div className="page detail-page">
      <Link className="back-link" to="/albums">
        ← 全部专辑
      </Link>
      {error ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : !album ? (
        <SectionState kind="loading" message="正在加载专辑…" />
      ) : (
        <>
          <header className="album-hero">
            <Artwork src={album.coverUrl} alt={album.title} className="album-hero-artwork" />
            <div className="album-hero-copy">
              <p className="eyebrow">ALBUM · {album.publishYear ?? '未标注年份'}</p>
              <h1>{album.title}</h1>
              <p>{album.artist.name}</p>
              <small>{album.tracks.length} 首已发布曲目</small>
            </div>
          </header>
          {album.description && <p className="album-description">{album.description}</p>}
          <div className="library-heading">
            <h2>曲目列表</h2>
            <span>{album.tracks.length} 首</span>
          </div>
          {album.tracks.length ? (
            <div className="track-list">
              {album.tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index + 1}
                  onPlay={() => manager.playFromQueue(album.tracks, index)}
                />
              ))}
            </div>
          ) : (
            <SectionState kind="empty" message="这张专辑还没有已发布曲目。" />
          )}
        </>
      )}
    </div>
  );
}

export function AlbumDetailPage() {
  const { id } = useParams();
  return id ? (
    <AlbumContent key={id} id={id} />
  ) : (
    <SectionState kind="error" message="专辑不存在。" />
  );
}
