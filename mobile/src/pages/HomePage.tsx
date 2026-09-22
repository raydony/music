import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAlbums, listCategories, listTracks } from '../api/client';
import type { AlbumListItem, Category, TrackListItem } from '../api/types';
import { Artwork } from '../components/Artwork';
import { SectionState } from '../components/SectionState';
import { TrackRow } from '../components/TrackRow';
import { usePlayer } from '../player/usePlayer';

interface HomeData {
  tracks: TrackListItem[];
  categories: Category[];
  albums: AlbumListItem[];
}

export function HomePage() {
  const { manager } = usePlayer();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listTracks(1, 6, controller.signal),
      listCategories(controller.signal),
      listAlbums(1, 6, controller.signal),
    ])
      .then(([tracks, categories, albums]) => {
        if (!controller.signal.aborted)
          setData({ tracks: tracks.data, categories, albums: albums.data });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : '加载失败，请稍后重试。');
      });
    return () => controller.abort();
  }, [retryKey]);

  const retry = () => {
    setError(null);
    setRetryKey((value) => value + 1);
  };

  return (
    <div className="page home-page">
      <header className="brand-header">
        <div className="brand-symbol" aria-hidden="true">
          <span />
        </div>
        <div>
          <strong>梵音集</strong>
          <small>FANYINJI · MUSIC ARCHIVE</small>
        </div>
      </header>

      <section className="hero">
        <div className="hero-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">让声音，慢下来</p>
        <h1>
          在音乐里，
          <br />
          留一刻安静。
        </h1>
        <p className="hero-description">典藏梵呗、赞偈与传统器乐，慢慢听见每一种声音。</p>
        <Link className="hero-link" to="/tracks">
          探索曲库 <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <Link className="search-entry" to="/tracks" aria-label="前往曲库，筛选已加载的曲目">
        <span className="search-icon" aria-hidden="true" />
        <span>在已加载曲目中查找</span>
        <span className="search-arrow" aria-hidden="true">
          →
        </span>
      </Link>

      {error ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : !data ? (
        <SectionState kind="loading" message="正在整理曲库…" />
      ) : (
        <>
          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">COLLECTION</p>
                <h2>音乐分类</h2>
              </div>
              <Link to="/categories">
                查看全部 <span aria-hidden="true">→</span>
              </Link>
            </div>
            {data.categories.length ? (
              <div className="category-scroll" aria-label="音乐分类">
                {data.categories.map((category, index) => (
                  <Link
                    className={`category-card category-tone-${index % 4}`}
                    key={category.id}
                    to={`/categories/${category.id}`}
                  >
                    <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{category.name}</strong>
                    <small>{category.publishedTrackCount} 首曲目</small>
                  </Link>
                ))}
              </div>
            ) : (
              <SectionState kind="empty" message="暂时还没有分类。" />
            )}
          </section>

          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">RECENTLY ADDED</p>
                <h2>最新收录</h2>
              </div>
              <Link to="/tracks">
                查看全部 <span aria-hidden="true">→</span>
              </Link>
            </div>
            {data.tracks.length ? (
              <div className="track-list">
                {data.tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index + 1}
                    onPlay={() => manager.playFromQueue(data.tracks, index)}
                  />
                ))}
              </div>
            ) : (
              <SectionState kind="empty" message="暂时还没有收录曲目。" />
            )}
          </section>

          <section className="content-section albums-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ALBUMS</p>
                <h2>专辑馆藏</h2>
              </div>
              <Link to="/albums">
                查看全部 <span aria-hidden="true">→</span>
              </Link>
            </div>
            {data.albums.length ? (
              <div className="album-grid">
                {data.albums.map((album) => (
                  <Link className="album-card" key={album.id} to={`/albums/${album.id}`}>
                    <Artwork src={album.coverUrl} alt={album.title} className="album-artwork" />
                    <h3 title={album.title}>{album.title}</h3>
                    <p title={album.artist.name}>{album.artist.name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <SectionState kind="empty" message="暂时还没有专辑。" />
            )}
          </section>
        </>
      )}
      <footer className="page-footer">梵音集 · 让每一次聆听有所停留</footer>
    </div>
  );
}
