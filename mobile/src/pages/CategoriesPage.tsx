import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCategories } from '../api/client';
import type { Category } from '../api/types';
import { SectionState } from '../components/SectionState';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listCategories(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCategories(result);
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
    <div className="page collection-page">
      <header className="inner-header">
        <p className="eyebrow">EXPLORE BY KIND</p>
        <h1>音乐分类</h1>
        <p>按声音的脉络，寻找想听的内容。</p>
      </header>
      {error ? (
        <SectionState kind="error" message={error} onRetry={retry} />
      ) : !categories ? (
        <SectionState kind="loading" message="正在加载分类…" />
      ) : categories.length === 0 ? (
        <SectionState kind="empty" message="暂时还没有分类。" />
      ) : (
        <div className="category-list">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              className={`category-list-card category-tone-${index % 4}`}
              to={`/categories/${category.id}`}
            >
              <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>{category.name}</strong>
              <small>{category.publishedTrackCount} 首曲目</small>
              <span className="card-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
