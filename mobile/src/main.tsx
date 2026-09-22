import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { PlayerProvider } from './player/PlayerProvider';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing app root');

createRoot(root).render(
  <StrictMode>
    <PlayerProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PlayerProvider>
  </StrictMode>,
);
