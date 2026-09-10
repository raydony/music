let navigationPending = false;

export function openPlayerPage(): void {
  const pages = getCurrentPages();
  if (pages[pages.length - 1]?.route === 'pages/player/index' || navigationPending) {
    return;
  }

  navigationPending = true;
  wx.navigateTo({
    url: '/pages/player/index',
    complete: () => {
      navigationPending = false;
    },
  });
}
