import { playerManager } from '../../player/player-manager';
import type { PlayableTrack, PlayerState } from '../../player/player-types';
import { openPlayerPage } from '../../utils/player-navigation';

const unsubscribeByInstance = new WeakMap<object, () => void>();

Component({
  properties: {
    track: {
      type: Object,
      value: {
        id: '',
        title: '',
        subtitle: '',
        audioUrl: '',
        coverUrl: '',
        duration: 0,
        durationLabel: '',
        artist: { id: '', name: '', type: 'OTHER' },
        album: null,
        category: { id: '', name: '' },
      },
    },
    queue: {
      type: Array,
      value: [],
    },
  },

  data: {
    isCurrent: false,
    playerStatus: 'idle' as PlayerState['status'],
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
          isCurrent: state.currentTrack?.id === (this.data.track as PlayableTrack).id,
          playerStatus: state.status,
        });
      });
      unsubscribeByInstance.set(this, unsubscribe);
    },

    stopSubscription() {
      unsubscribeByInstance.get(this)?.();
      unsubscribeByInstance.delete(this);
    },

    playAndOpenPlayer() {
      const track = this.data.track as PlayableTrack;
      if (!track.id) {
        return;
      }
      const queue = this.data.queue as PlayableTrack[];
      playerManager.playTrack(track, queue.length ? queue : [track]);
      openPlayerPage();
    },

    togglePlayback() {
      const track = this.data.track as PlayableTrack;
      if (!track.id) {
        return;
      }
      if (this.data.isCurrent) {
        if (this.data.playerStatus === 'playing') {
          playerManager.pause();
        } else if (this.data.playerStatus === 'error') {
          playerManager.retry();
        } else {
          playerManager.resume();
        }
        return;
      }
      const queue = this.data.queue as PlayableTrack[];
      playerManager.playTrack(track, queue.length ? queue : [track]);
    },
  },
});
