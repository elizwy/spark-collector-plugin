// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSnippet",
    title: "保存到灵感收藏",
    contexts: ["selection"]
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveSnippet") {
    chrome.tabs.sendMessage(tab.id, {
      action: "openSaveDialog",
      text: info.selectionText
    });
  }
}); 