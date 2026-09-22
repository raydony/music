import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Artwork } from '../components/Artwork';
import { currentLyricIndex, parseLrc } from '../player/lrc';
import { formatTime } from '../player/format-time';
import { usePlayer } from '../player/usePlayer';

function ProgressControl() {
  const { manager, state } = usePlayer();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const duration = state.duration > 0 ? state.duration : 0;
  const displayTime = dragTime ?? state.currentTime;

  const commitSeek = () => {
    if (dragRef.current === null) return;
    manager.seek(dragRef.current);
    dragRef.current = null;
    setDragTime(null);
  };

  return (
    <div className="progress-control">
      <input
        aria-label="播放进度"
        type="range"
        min="0"
        max={duration || 1}
        step="1"
        value={Math.min(displayTime, duration || 1)}
        disabled={!duration}
        onChange={(event) => {
          const next = Number(event.target.value);
          dragRef.current = next;
          setDragTime(next);
        }}
        onPointerUp={commitSeek}
        onTouchEnd={commitSeek}
        onKeyUp={commitSeek}
        onBlur={commitSeek}
        style={
          {
            '--progress': `${duration ? Math.min(100, (displayTime / duration) * 100) : 0}%`,
          } as CSSProperties
        }
      />
      <div className="progress-times">
        <span>{formatTime(displayTime)}</span>
        <span>{duration ? formatTime(duration) : '--:--'}</span>
      </div>
    </div>
  );
}

export function PlayerPage() {
  const navigate = useNavigate();
  const { manager, state } = usePlayer();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lines = useMemo(() => parseLrc(state.detail?.lyricsLrc), [state.detail?.lyricsLrc]);
  const activeIndex = currentLyricIndex(lines, state.currentTime);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateSpacer = () => {
      container.style.setProperty(
        '--lyric-spacer',
        `${Math.max(12, container.clientHeight / 2 - 20)}px`,
      );
    };
    updateSpacer();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSpacer);
    observer.observe(container);
    return () => observer.disconnect();
  }, [state.currentTrack?.id]);

  useEffect(() => {
    const container = scrollRef.current;
    const line = lineRefs.current[activeIndex];
    if (!container || !line) return;
    container.scrollTo({
      top: line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [activeIndex, state.currentTrack?.id]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  if (!state.currentTrack) {
    return (
      <div className="player-page player-empty">
        <button type="button" className="back-link" onClick={goBack}>
          ← 返回
        </button>
        <div>
          <p>还没有正在播放的曲目。</p>
          <Link className="outline-button" to="/tracks">
            浏览曲库 →
          </Link>
        </div>
      </div>
    );
  }

  const track = state.currentTrack;
  return (
    <div className="player-page">
      <header className="player-header">
        <button type="button" onClick={goBack} aria-label="返回上一页">
          ←
        </button>
        <span>正在聆听</span>
        <span className="player-header-spacer" />
      </header>
      <div className="player-artwork-wrap">
        <Artwork src={track.coverUrl} alt={track.title} className="player-artwork" />
      </div>
      <div className="player-track-info">
        <h1 title={track.title}>{track.title}</h1>
        <p>{track.artist.name}</p>
      </div>
      <section className="player-lyrics" aria-label="歌词">
        <div className="lyrics-scroll" ref={scrollRef} key={track.id}>
          {state.detailLoading ? (
            <p className="lyrics-message">正在加载歌词…</p>
          ) : state.detailError ? (
            <p className="lyrics-message">{state.detailError}</p>
          ) : lines.length ? (
            <div className="lrc-lines">
              {lines.map((line, index) => (
                <button
                  key={`${line.time}-${index}`}
                  ref={(node) => {
                    lineRefs.current[index] = node;
                  }}
                  type="button"
                  className={`lrc-line${index === activeIndex ? ' is-active' : ''}`}
                  onClick={() => manager.seek(line.time)}
                >
                  {line.text}
                </button>
              ))}
            </div>
          ) : state.detail?.lyrics ? (
            <p className="plain-lyrics">{state.detail.lyrics}</p>
          ) : (
            <p className="lyrics-message">暂无歌词</p>
          )}
        </div>
      </section>
      <div className="player-bottom">
        {state.error && (
          <p className="player-error" role="alert">
            {state.error}
          </p>
        )}
        <ProgressControl key={track.id} />
        <div className="player-controls">
          <button type="button" aria-label="上一首" onClick={() => manager.previous()}>
            |◁
          </button>
          <button
            type="button"
            className="play-toggle"
            aria-label={state.isPlaying ? '暂停' : '播放'}
            onClick={() => (state.isPlaying ? manager.pause() : manager.resume())}
          >
            {state.loading ? '…' : state.isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <button type="button" aria-label="下一首" onClick={() => manager.next()}>
            ▷|
          </button>
        </div>
        <p className="queue-caption">
          播放队列 · {state.currentIndex + 1} / {state.queue.length}
        </p>
      </div>
    </div>
  );
}
