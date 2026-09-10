import { playerManager } from '../../player/player-manager';
import type { PlayerState } from '../../player/player-types';

const unsubscribeByInstance = new WeakMap<object, () => void>();

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    queue: [] as PlayerState['queue'],
    currentIndex: -1,
    currentTrackId: '',
    status: 'idle' as PlayerState['status'],
    queueAnchor: '',
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
          queue: state.queue,
          currentIndex: state.currentIndex,
          currentTrackId: state.currentTrack?.id ?? '',
          status: state.status,
          queueAnchor: state.currentIndex >= 0 ? `queue-track-${state.currentIndex}` : '',
        });
      });
      unsubscribeByInstance.set(this, unsubscribe);
    },

    stopSubscription() {
      unsubscribeByInstance.get(this)?.();
      unsubscribeByInstance.delete(this);
    },

    close() {
      // Keep the overlay mounted until the current tap has fully finished so
      // the release cannot land on an actionable item underneath the mask.
      setTimeout(() => {
        this.triggerEvent('close');
      }, 80);
    },

    selectTrack(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= this.data.queue.length) {
        return;
      }
      if (index === this.data.currentIndex) {
        if (this.data.status === 'paused') {
          playerManager.resume();
        } else if (this.data.status === 'error' || this.data.status === 'ended') {
          playerManager.retry();
        }
      } else {
        playerManager.playFromQueue(index);
      }
      this.close();
    },
  },
});
