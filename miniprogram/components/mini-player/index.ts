import { playerManager } from '../../player/player-manager';
import type { PlayerState } from '../../player/player-types';
import { openPlayerPage } from '../../utils/player-navigation';

const unsubscribeByInstance = new WeakMap<object, () => void>();

Component({
  data: {
    currentTrack: null as PlayerState['currentTrack'],
    status: 'idle' as PlayerState['status'],
    progress: 0,
    queueVisible: false,
  },

  lifetimes: {
    attached() {
      this.startSubscription();
    },
    detached() {
      this.stopSubscription();
    },
  },

  pageLifetimes: {
    show() {
      this.startSubscription();
    },
    hide() {
      this.stopSubscription();
    },
  },

  methods: {
    startSubscription() {
      if (unsubscribeByInstance.has(this)) {
        return;
      }
      const unsubscribe = playerManager.subscribe((state) => {
        this.setData({
          currentTrack: state.currentTrack,
          status: state.status,
          progress: state.progress,
        });
      });
      unsubscribeByInstance.set(this, unsubscribe);
    },

    stopSubscription() {
      unsubscribeByInstance.get(this)?.();
      unsubscribeByInstance.delete(this);
    },

    handleOpenPlayer() {
      openPlayerPage();
    },

    handleTogglePlayback() {
      if (this.data.status === 'playing') {
        playerManager.pause();
      } else if (this.data.status === 'error') {
        playerManager.retry();
      } else {
        playerManager.resume();
      }
    },

    handleNext() {
      playerManager.next();
    },

    handleOpenQueue() {
      this.setData({ queueVisible: true });
    },

    handleCloseQueue() {
      this.setData({ queueVisible: false });
    },
  },
});
