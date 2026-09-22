import { useEffect, useMemo, useRef, useState } from 'react';
import { listTracks } from '../api/client';
import type { PageMeta, TrackListItem } from '../api/types';
import { SectionState } from '../components/SectionState';
import { TrackRow } from '../components/TrackRow';
import { usePlayer } from '../player/usePlayer';

const PAGE_SIZE = 20;

export function TracksPage() {
  const { manager } = usePlayer();
  const [tracks, setTracks] = useState<TrackListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTracks(1, PAGE_SIZE, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setTracks(result.data);
        setMeta(result.meta);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : '加载失败，请稍后重试。');
        setLoading(false);
      });
    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [retryKey]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return tracks;
    return tracks.filter((track) =>
      [
        track.title,
        track.subtitle,
        track.artist.name,
        track.album?.title,
        track.category.name,
      ].some((value) => value?.toLocaleLowerCase().includes(keyword)),
    );
  }, [tracks, query]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setRetryKey((value) => value + 1);
  };

  const loadMore = async () => {
    if (!meta || loadingMore || meta.page >= meta.totalPages) return;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await listTracks(meta.page + 1, PAGE_SIZE, controller.signal);
      if (controller.signal.aborted) return;
      setTracks((current) => [...current, ...result.data]);
      setMeta(result.meta);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : '加载失败，请稍后重试。');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  return (
    <div className="page tracks-page">
      <header className="inner-header">
        <p className="eyebrow">MUSIC LIBRARY</p>
        <h1>曲库</h1>
        <p>从最近收录开始，慢慢探索。</p>
      </header>
      <label className="search-field">
        <span className="search-icon" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="筛选曲名、艺术家、分类"
          type="search"
        />
      </label>
      <p className="search-scope">仅筛选当前已加载的 {tracks.length} 首曲目，并非全库搜索</p>

      <div className="library-heading">
        <h2>全部曲目</h2>
        <span>{meta ? `${meta.total} 首收录` : '—'}</span>
      </div>
      {loading ? (
        <SectionState kind="loading" message="正在加载曲目…" />
      ) : error && !tracks.length ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : tracks.length === 0 ? (
        <SectionState kind="empty" message="暂时还没有收录曲目。" />
      ) : (
        <>
          {filtered.length ? (
            <div className="track-list library-list">
              {filtered.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  onPlay={() => manager.playFromQueue(filtered, index)}
                />
              ))}
            </div>
          ) : (
            <SectionState kind="empty" message="当前已加载的曲目中没有匹配结果。" />
          )}
          {error && <SectionState kind="error" message={error} />}
          {meta && meta.page < meta.totalPages && (
            <button
              className="load-more"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {loadingMore ? '正在加载…' : '加载更多曲目'}
            </button>
          )}
          {meta && meta.page >= meta.totalPages && <p className="list-end">已到曲库末尾</p>}
        </>
      )}
    </div>
  );
}
