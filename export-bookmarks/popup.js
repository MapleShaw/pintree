document.addEventListener('DOMContentLoaded', () => {
  const bookmarkTree = document.getElementById('bookmarkTree');
  const exportBtn = document.getElementById('exportBtn');
  let selectedBookmarks = new Set();
  let folders = {};

  // 生成随机字符串
  function generateRandomString(length = 6) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  // 递归收集文件夹
  async function collectFolders(node, level = 0, parentId = null) {
    if (!folders[level]) {
      folders[level] = [[]];
    }
    
    if (node.children) {
      // 只收集包含书签的文件夹
      const hasSelectedBookmarks = node.children.some(child => 
        selectedBookmarks.has(child) || 
        (child.children && child.children.some(grandChild => selectedBookmarks.has(grandChild)))
      );

      if (hasSelectedBookmarks || level === 0) {
        const folderData = {
          name: node.title || "根目录",
          tempId: node.id,
          parentTempId: parentId,
          sortOrder: 0
        };

        folders[level][0].push(folderData);
      }
      
      for (const child of node.children) {
        if (child.children) {
          await collectFolders(child, level + 1, node.id);
        }
      }
    }
  }

  // 获取并显示书签树
  chrome.bookmarks.getTree(async (bookmarkNodes) => {
    displayBookmarks(bookmarkNodes[0], bookmarkTree);
  });

  // 递归显示书签
  function displayBookmarks(node, container) {
    if (node.children) {
      const folder = document.createElement('div');
      folder.className = 'folder';
      
      const folderHeader = document.createElement('div');
      folderHeader.className = 'folder-header';

      // 添加文件夹的复选框
      const folderCheckbox = document.createElement('input');
      folderCheckbox.type = 'checkbox';
      folderCheckbox.className = 'folder-checkbox';
      
      const folderTitle = document.createElement('span');
      folderTitle.className = 'folder-title';
      folderTitle.textContent = node.title || '根目录';
      
      folderHeader.appendChild(folderCheckbox);
      folderHeader.appendChild(folderTitle);
      folder.appendChild(folderHeader);

      const folderContent = document.createElement('div');
      folderContent.className = 'folder-content';
      
      // 存储文件夹下所有书签的复选框引用
      const childCheckboxes = [];
      
      node.children.forEach(child => {
        const result = displayBookmarks(child, folderContent);
        if (result && result.checkbox) {
          childCheckboxes.push(result.checkbox);
        }
      });

      // 件夹复选框的点击事件
      folderCheckbox.addEventListener('change', (e) => {
        childCheckboxes.forEach(checkbox => {
          checkbox.checked = e.target.checked;
          // 触发每个子书签的 change 事件
          checkbox.dispatchEvent(new Event('change'));
        });
      });

      folder.appendChild(folderContent);
      container.appendChild(folder);
      
    } else if (node.url) {
      const bookmark = document.createElement('div');
      bookmark.className = 'bookmark';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bookmark-checkbox';
      checkbox.dataset.id = node.id;
      checkbox.dataset.url = node.url;
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedBookmarks.add({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded,
            parentId: node.parentId
          });
        } else {
          selectedBookmarks.delete(Array.from(selectedBookmarks).find(b => b.id === node.id));
        }
        updateExportButton();
      });

      const favicon = document.createElement('img');
      // 使用 Google 的 favicon 服务
      favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(node.url).hostname)}`;
      favicon.className = 'favicon';
      favicon.onerror = () => {
        favicon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyVpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDQ4OCwgMjAyMC8wNy8xMC0yMjowNjo1MyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIyLjAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ:Y0Q5Nzg3N0M2QzE5MTExRUJCRDY4OEY2QzU5QjU1RTc2IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjBDOTc4NzdDNkMxOTExRUJCRDY4OEY2QzU5QjU1RTc2Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MEM5Nzg3N0E2QzE5MTFFQkJENjg4RjZDNTlCNTVFNzYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MEM5Nzg3N0I2QzE5MTFFQkJENjg4RjZDNTlCNTVFNzYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4KlzW4AAAAk0lEQVR42mL8//8/AyUAIIAY0Pn/YZQxFhYWBmYg/gfEf4H4HxMQMwPxfyZGRkagHAOQDqGA8wACCKtLmNAAExA3A/EGJJA2QPFGoHgjEDMhG/AfqnY9EDMA8QSgmAELELMwMgId+R+KmaGGMTEiOQfZC4xQF6D7hgVqKgvUi8jexqmXBZ8XmAh5gZGQAYAAAwC0OBwPHHl2iwAAAABJRU5ErkJggg==';
      };

      const title = document.createElement('span');
      title.textContent = node.title;

      bookmark.appendChild(checkbox);
      bookmark.appendChild(favicon);
      bookmark.appendChild(title);
      container.appendChild(bookmark);

      return { checkbox }; // 返回复选框引用
    }
  }

  // 更新导出按钮状态
  function updateExportButton() {
    const count = selectedBookmarks.size;
    exportBtn.textContent = `导出所选书签 (${count})`;
    exportBtn.disabled = count === 0;
  }

  // 获取 favicon 的 base64 格式
  async function getFaviconBase64(url) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'getFavicon', 
            url: `chrome://favicon/${url}`
          },
          resolve
        );
      });
      return response.favicon;
    } catch (error) {
      console.error('获取图标���败:', error);
      return null;
    }
  }

  // 导出功能
  exportBtn.addEventListener('click', async () => {
    if (selectedBookmarks.size === 0) {
      alert('请至少选择一个书签！');
      return;
    }

    exportBtn.disabled = true;
    exportBtn.textContent = '导出中...';

    try {
      // 重置并重新收集文件夹信息
      folders = {};
      await chrome.bookmarks.getTree(async (bookmarkNodes) => {
        await collectFolders(bookmarkNodes[0]);
      });

      // 清理空层级的文件夹
      Object.keys(folders).forEach(level => {
        if (folders[level][0].length === 0) {
          delete folders[level];
        }
      });

      // 获取当前时间戳
      const timestamp = new Date().toISOString().split('T')[0];
      const randomSuffix = generateRandomString();

      // 构建新的数据结构
      const bookmarksTree = {
        metadata: {
          exportedFrom: "PintreePro",
          version: "1.0",
          created: new Date().toISOString(),
          suggestedName: `Chrome Bookmarks ${timestamp}-${randomSuffix}`, // 添加建议的集合名称
          description: `Exported from Chrome on ${timestamp}` // 添加默认描述
        },
        folders: folders,
        bookmarks: []
      };

      // 将选中的书签转换为数组格式
      const bookmarksData = await Promise.all(
        Array.from(selectedBookmarks).map(async bookmark => {
          const folderPath = await getBookmarkPath(bookmark.parentId);
          const faviconBase64 = await getFaviconBase64(bookmark.url);
          
          return {
            title: bookmark.title,
            url: bookmark.url,
            description: "",
            icon: faviconBase64 || "",
            isFeatured: false,
            sortOrder: 0,
            folderTempId: bookmark.parentId,
            tags: []
          };
        })
      );

      bookmarksTree.bookmarks = bookmarksData;

      console.log('文件夹结构:', folders);
      console.log('处理后的书签数据:', bookmarksData);
      console.log('最终导出数据:', bookmarksTree);

      // 导出文件
      const jsonData = JSON.stringify(bookmarksTree, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      chrome.downloads.download({
        url: url,
        filename: `pintree-bookmarks-${fileTimestamp}.json`,
        saveAs: true
      });

    } catch (error) {
      console.error('导出失败:', error);
      alert('导出过程中发生错误，请重试');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '导出所选书签';
    }
  });

  // 获取书签的完整路径
  async function getBookmarkPath(bookmarkId) {
    const folders = [];
    let currentId = bookmarkId;

    while (currentId) {
      try {
        const node = (await new Promise(resolve => {
          chrome.bookmarks.get(currentId, resolve);
        }))[0];

        if (!node.parentId) break;
        if (node.title) folders.unshift(node.title);
        currentId = node.parentId;
      } catch (error) {
        break;
      }
    }

    return folders.join(' / ');
  }
});