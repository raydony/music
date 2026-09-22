import type { ReactNode } from 'react';
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TracksPage } from './pages/TracksPage';
import { PendingPage } from './pages/PendingPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { PlayerPage } from './pages/PlayerPage';
import { MiniPlayer } from './components/MiniPlayer';
import { usePlayer } from './player/usePlayer';

type IconName = 'home' | 'library' | 'category' | 'album';

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Zm6 11v-7h6v7" />,
    library: (
      <>
        <path d="M5 4h14M5 9h14M5 14h14M5 19h9" />
        <circle cx="18" cy="19" r="2" />
      </>
    ),
    category: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    album: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function MobileLayout() {
  const { state } = usePlayer();
  const { pathname } = useLocation();
  const isPlayerPage = pathname === '/player';
  const items: { to: string; label: string; icon: IconName }[] = [
    { to: '/', label: '首页', icon: 'home' },
    { to: '/tracks', label: '曲库', icon: 'library' },
    { to: '/categories', label: '分类', icon: 'category' },
    { to: '/albums', label: '专辑', icon: 'album' },
  ];

  return (
    <div
      className={`app-frame${state.currentTrack && !isPlayerPage ? ' has-mini-player' : ''}${isPlayerPage ? ' is-player-page' : ''}`}
    >
      <main className="app-main">
        <Outlet />
      </main>
      {!isPlayerPage && state.currentTrack && <MiniPlayer />}
      {!isPlayerPage && (
        <nav className="bottom-nav" aria-label="主导航">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<MobileLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tracks" element={<TracksPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:id" element={<CategoryDetailPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumDetailPage />} />
        <Route path="player" element={<PlayerPage />} />
        <Route path="*" element={<PendingPage title="页面不存在" />} />
      </Route>
    </Routes>
  );
}
