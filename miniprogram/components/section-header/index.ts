Component({
  properties: {
    title: {
      type: String,
      value: '',
    },
    linkText: {
      type: String,
      value: '查看全部',
    },
    url: {
      type: String,
      value: '',
    },
  },

  methods: {
    openLink() {
      if (this.data.url) {
        wx.navigateTo({ url: this.data.url });
      }
    },
  },
});
