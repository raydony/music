Component({
  properties: {
    text: {
      type: String,
      value: '暂无内容',
    },
    actionText: {
      type: String,
      value: '',
    },
  },

  methods: {
    onAction() {
      this.triggerEvent('retry');
    },
  },
});
