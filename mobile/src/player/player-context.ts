import { createContext } from 'react';
import type { PlayerManager } from './player-manager';

export const PlayerContext = createContext<PlayerManager | null>(null);
