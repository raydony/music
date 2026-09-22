import type { ReactNode } from 'react';
import { PlayerContext } from './player-context';
import { getPlayerManager } from './player-instance';

export function PlayerProvider({ children }: { children: ReactNode }) {
  return <PlayerContext.Provider value={getPlayerManager()}>{children}</PlayerContext.Provider>;
}
