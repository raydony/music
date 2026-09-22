import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AdminLayout } from './layouts/AdminLayout';
import { DashboardPage } from './pages/Dashboard';
import { AlbumsPage } from './pages/Albums';
import { ArtistsPage } from './pages/Artists';
import { CategoriesPage } from './pages/Categories';
import { TracksPage } from './pages/Tracks';
import { BulkImportPage } from './pages/Tracks/BulkImportPage';
import { LoginPage } from './pages/Login';
import { LoginRoute, ProtectedRoute } from './auth/route-guards';

function App() {
  return (
    <Routes>
      <Route element={<LoginRoute />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tracks" element={<TracksPage />} />
          <Route path="tracks/import" element={<BulkImportPage />} />
          <Route path="albums" element={<AlbumsPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
