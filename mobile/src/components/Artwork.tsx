import { useState } from 'react';

interface ArtworkProps {
  src: string | null;
  alt: string;
  className?: string;
}

function ArtworkImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className="artwork-fallback" aria-label={`${alt}暂无封面`}>
        梵<br />音
      </span>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export function Artwork({ src, alt, className = '' }: ArtworkProps) {
  return (
    <span className={`artwork ${className}`}>
      {src ? (
        <ArtworkImage key={src} src={src} alt={alt} />
      ) : (
        <span className="artwork-fallback" aria-label={`${alt}暂无封面`}>
          梵<br />音
        </span>
      )}
    </span>
  );
}
