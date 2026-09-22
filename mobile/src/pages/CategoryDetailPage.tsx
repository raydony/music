import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listCategories, listCategoryTracks } from '../api/client';
import type { Category } from '../api/types';
import { SectionState } from '../components/SectionState';
import { TrackRow } from '../components/TrackRow';
import { usePagedList } from '../hooks/usePagedList';
import { usePlayer } from '../player/usePlayer';

function CategoryContent({ id }: { id: string }) {
  const { manager } = usePlayer();
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const loadPage = useCallback(
    (page: number, signal: AbortSignal) => listCategoryTracks(id, page, 20, signal),
    [id],
  );
  const { items, meta, loading, loadingMore, error, retry, loadMore } = usePagedList(loadPage);

  useEffect(() => {
    const controller = new AbortController();
    listCategories(controller.signal)
      .then((categories) => {
        if (controller.signal.aborted) return;
        const found = categories.find((item) => item.id === id);
        if (found) setCategory(found);
        else setCategoryError('分类不存在。');
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setCategoryError(reason instanceof Error ? reason.message : '分类信息暂不可用。');
      });
    return () => controller.abort();
  }, [id]);

  return (
    <div className="page detail-page">
      <Link className="back-link" to="/categories">
        ← 全部分类
      </Link>
      <header className="inner-header">
        <p className="eyebrow">MUSIC CATEGORY</p>
        <h1>{category?.name ?? '分类曲目'}</h1>
        <p>{category?.description ?? (categoryError || '按分类聆听收录曲目。')}</p>
      </header>
      <div className="library-heading">
        <h2>曲目</h2>
        <span>{meta ? `${meta.total} 首` : '—'}</span>
      </div>
      {loading ? (
        <SectionState kind="loading" message="正在加载曲目…" />
      ) : error && !items.length ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <SectionState kind="empty" message="这个分类还没有已发布曲目。" />
      ) : (
        <>
          <div className="track-list library-list">
            {items.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                onPlay={() => manager.playFromQueue(items, index)}
              />
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
              {loadingMore ? '正在加载…' : '加载更多曲目'}
            </button>
          )}
          {meta && meta.page >= meta.totalPages && <p className="list-end">已到曲目末尾</p>}
        </>
      )}
    </div>
  );
}

export function CategoryDetailPage() {
  const { id } = useParams();
  return id ? (
    <CategoryContent key={id} id={id} />
  ) : (
    <SectionState kind="error" message="分类不存在。" />
  );
}
