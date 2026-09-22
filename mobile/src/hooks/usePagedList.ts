import { useEffect, useRef, useState } from 'react';
import type { PageMeta, PageResponse } from '../api/types';

export function usePagedList<T>(
  loadPage: (page: number, signal: AbortSignal) => Promise<PageResponse<T>>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadPage(1, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.data);
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
  }, [loadPage, retryKey]);

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
      const result = await loadPage(meta.page + 1, controller.signal);
      if (controller.signal.aborted) return;
      setItems((current) => [...current, ...result.data]);
      setMeta(result.meta);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : '加载失败，请稍后重试。');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  return { items, meta, loading, loadingMore, error, retry, loadMore };
}
