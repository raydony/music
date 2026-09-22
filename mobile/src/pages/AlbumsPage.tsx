import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAlbums } from '../api/client';
import { Artwork } from '../components/Artwork';
import { SectionState } from '../components/SectionState';
import { usePagedList } from '../hooks/usePagedList';

export function AlbumsPage() {
  const loadPage = useCallback(
    (page: number, signal: AbortSignal) => listAlbums(page, 12, signal),
    [],
  );
  const { items, meta, loading, loadingMore, error, retry, loadMore } = usePagedList(loadPage);

  return (
    <div className="page collection-page">
      <header className="inner-header">
        <p className="eyebrow">ALBUM COLLECTION</p>
        <h1>专辑馆藏</h1>
        <p>从一张专辑，走进一组声音。</p>
      </header>
      {loading ? (
        <SectionState kind="loading" message="正在加载专辑…" />
      ) : error && !items.length ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <SectionState kind="empty" message="暂时还没有专辑。" />
      ) : (
        <>
          <div className="album-grid album-list-grid">
            {items.map((album) => (
              <Link className="album-card" key={album.id} to={`/albums/${album.id}`}>
                <Artwork src={album.coverUrl} alt={album.title} className="album-artwork" />
                <h3 title={album.title}>{album.title}</h3>
                <p title={album.artist.name}>{album.artist.name}</p>
                <small>{album.publishedTrackCount} 首曲目</small>
              </Link>
            ))}
          </div>
          {error && <SectionState kind="error" message={error} />}
          {meta && meta.page < meta.totalPages && (
            <button
              className="load-more"
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? '正在加载…' : '加载更多专辑'}
            </button>
          )}
          {meta && meta.page >= meta.totalPages && <p className="list-end">已到专辑末尾</p>}
        </>
      )}
    </div>
  );
}
