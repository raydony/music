Component({
  properties: {
    src: {
      type: String,
      value: '',
      observer() {
        this.setData({ failed: false });
      },
    },
    label: {
      type: String,
      value: '音',
    },
    circle: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    failed: false,
  },

  methods: {
    onImageError() {
      this.setData({ failed: true });
    },
  },
});
