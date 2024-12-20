// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理获取 favicon 的请求
  if (request.type === 'getFavicon') {
    fetch(request.url)
      .then(response => response.blob())
      .then(blob => {
        // 将图标转换为 base64 格式
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ favicon: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('获取 favicon 失败:', error);
        sendResponse({ favicon: null });
      });
    return true; // 保持消息通道开启
  }
});

// 处理安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('书签导出插件已安装');
});