import { getTrack } from '../api/client';
import { PlayerManager } from './player-manager';

let instance: PlayerManager | null = null;

export function getPlayerManager(): PlayerManager {
  if (!instance) instance = new PlayerManager(new Audio(), getTrack);
  return instance;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    instance?.destroy();
    instance = null;
  });
}
