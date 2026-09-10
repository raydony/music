import { useCallback, useEffect, useState } from 'react';
import type { PaginatedResponse } from '../api/types';

type PageLoader<T> = (query: { page: number; pageSize: number }) => Promise<PaginatedResponse<T>>;

export function usePaginatedList<T>(loader: PageLoader<T>, pageSize = 10) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [error, setError] = useState<unknown>();

  const reload = useCallback(() => {
    setLoading(true);
    setError(undefined);
    setRequestVersion((version) => version + 1);
  }, []);

  const changePage = useCallback((nextPage: number) => {
    setLoading(true);
    setError(undefined);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    let active = true;
    void loader({ page, pageSize })
      .then((response) => {
        if (!active) return;
        setItems(response.data);
        setTotal(response.meta.total);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError);
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loader, page, pageSize, requestVersion]);

  const refreshAfterDelete = useCallback(() => {
    if (items.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else {
      reload();
    }
  }, [items.length, page, reload]);

  return {
    items,
    page,
    pageSize,
    total,
    loading,
    error,
    setPage: changePage,
    reload,
    refreshAfterDelete,
  };
}
