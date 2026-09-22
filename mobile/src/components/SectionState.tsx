export function SectionState({
  kind,
  message,
  onRetry,
}: {
  kind: 'loading' | 'empty' | 'error';
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={`section-state state-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="state-symbol" aria-hidden="true">
        {kind === 'loading' ? '◌' : kind === 'error' ? '!' : '—'}
      </span>
      <p>{message}</p>
      {onRetry && (
        <button className="text-button" type="button" onClick={onRetry}>
          重新尝试
        </button>
      )}
    </div>
  );
}
