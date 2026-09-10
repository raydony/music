import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AdminLayout } from './layouts/AdminLayout';
import { DashboardPage } from './pages/Dashboard';
import { AlbumsPage } from './pages/Albums';
import { ArtistsPage } from './pages/Artists';
import { CategoriesPage } from './pages/Categories';
import { TracksPage } from './pages/Tracks';

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tracks" element={<TracksPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
