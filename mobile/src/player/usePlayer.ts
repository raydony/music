import { useContext, useSyncExternalStore } from 'react';
import { PlayerContext } from './player-context';

export function usePlayer() {
  const manager = useContext(PlayerContext);
  if (!manager) throw new Error('PlayerProvider is missing');
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return { manager, state };
}
