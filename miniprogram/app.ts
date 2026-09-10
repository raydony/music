import { playerManager } from './player/player-manager';

App({
  onLaunch() {
    playerManager.initialize();
  },
});
