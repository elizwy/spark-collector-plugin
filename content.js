// 创建一个全局变量来存储当前的事件监听器
let currentKeydownListener = null;

// 创建保存对话框
function createSaveDialog(text, metadata = null) {
  // 创建一个遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'inspiration-overlay';
  
  // 准备源信息文本
  let sourceInfo = '';
  if (metadata && metadata.type === 'pdf') {
    sourceInfo = `PDF文档：${metadata.title}，第 ${metadata.page} 页`;
  }
  
  const dialog = document.createElement('div');
  dialog.innerHTML = `
    <div class="save-dialog">
      <h3>保存段落</h3>
      <div class="content">${text}</div>
      ${sourceInfo ? `<div class="source-info">${sourceInfo}</div>` : ''}
      <div class="input-group">
        <label>标签（可选）：</label>
        <input type="text" id="tags" placeholder="用逗号分隔多个标签">
      </div>
      <div class="input-group">
        <label>笔记（可选）：</label>
        <textarea id="notes" placeholder="添加笔记..."></textarea>
      </div>
      <div class="buttons">
        <button id="saveBtn">保存</button>
        <button id="cancelBtn">取消</button>
      </div>
    </div>
  `;
  
  // 更新样式
  const style = document.createElement('style');
  style.textContent = `
    .inspiration-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .save-dialog {
      position: relative;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      min-width: 300px;
      max-width: 500px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .save-dialog * {
      box-sizing: border-box;
    }
    
    .save-dialog h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }
    
    .save-dialog .content {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .save-dialog .input-group {
      margin-bottom: 15px;
    }
    
    .save-dialog label {
      display: block;
      margin-bottom: 5px;
      color: #666;
      font-size: 14px;
    }
    
    .save-dialog input,
    .save-dialog textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .save-dialog textarea {
      height: 80px;
      resize: vertical;
    }
    
    .save-dialog .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    
    .save-dialog button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .save-dialog #saveBtn {
      background: #4a90e2;
      color: white;
    }
    
    .save-dialog #saveBtn:hover {
      background: #357abd;
    }
    
    .save-dialog #cancelBtn {
      background: #e0e0e0;
    }
    
    .save-dialog #cancelBtn:hover {
      background: #d0d0d0;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(overlay);
  overlay.appendChild(dialog);
  
  // 修改关闭对话框的函数
  const closeDialog = () => {
    overlay.remove();
    // 移除键盘事件监听器
    if (currentKeydownListener) {
      document.removeEventListener('keydown', currentKeydownListener);
      currentKeydownListener = null;
    }
  };

  // 绑定事件
  dialog.querySelector('#saveBtn').addEventListener('click', () => {
    const tagsInput = dialog.querySelector('#tags').value.trim();
    const notes = dialog.querySelector('#notes').value.trim();
    
    // 处理标签，如果为空则为空数组
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    chrome.storage.local.get(['snippets'], (result) => {
      const snippets = result.snippets || [];
      snippets.push({
        text,
        tags,
        notes,
        url: window.location.href,
        title: metadata?.title || document.title,
        date: new Date().toISOString(),
        source: metadata ? {
          type: 'pdf',
          title: metadata.title,
          page: metadata.page
        } : null
      });
      chrome.storage.local.set({ snippets }, () => {
        // 保存成功后显示提示
        const toast = document.createElement('div');
        toast.textContent = '保存成功！';
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 10000;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
    });
    
    closeDialog();
  });

  dialog.querySelector('#cancelBtn').addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });
  
  // 更新 ESC 键关闭对话框的处理
  currentKeydownListener = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
    }
  };
  document.addEventListener('keydown', currentKeydownListener);
}

// 创建一个防抖函数来处理选择文本事件
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 使用 Set 来跟踪事件监听器
const mousedownListeners = new Set();

// 处理选中文本的函数
const handleTextSelection = debounce((event) => {
  // 使用 getSelection() 获取选中的文本
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // 如果有选中文本，显示快捷操作按钮
  if (selectedText) {
    // 移除可能已存在的快捷按钮
    removeQuickSaveButton();
    
    // 创建快捷保存按钮
    const quickSaveBtn = document.createElement('div');
    quickSaveBtn.id = 'quick-save-btn';
    quickSaveBtn.innerHTML = '💡 保存灵感';
    
    // 获取选中文本的位置
    let rect;
    try {
      // 尝试获取选中区域的位置
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } catch (e) {
      // 如果无法获取选中区域位置，使用鼠标位置
      rect = {
        right: event.clientX,
        bottom: event.clientY
      };
    }
    
    // 设置按钮样式，确保最高层级显示
    const style = document.createElement('style');
    style.textContent = `
      #quick-save-btn {
        position: fixed;
        background: #4a90e2;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        z-index: 2147483647;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: all 0.2s;
        user-select: none;
        -webkit-user-select: none;
      }
      #quick-save-btn:hover {
        background: #357abd;
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
    
    // 计算按钮位置，确保在视口内
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const btnWidth = 100; // 估计按钮宽度
    const btnHeight = 36; // 估计按钮高度
    
    let left = rect.right + window.scrollX;
    let top = rect.bottom + window.scrollY;
    
    // 确保按钮不会超出视口右边界
    if (left + btnWidth > viewportWidth) {
      left = viewportWidth - btnWidth - 10;
    }
    
    // 确保按钮不会超出视口下边界
    if (top + btnHeight > viewportHeight) {
      top = rect.top + window.scrollY - btnHeight - 5;
    }
    
    // 设置按钮位置
    quickSaveBtn.style.left = `${left}px`;
    quickSaveBtn.style.top = `${top}px`;
    
    // 阻止按钮上的事件冒泡
    quickSaveBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    quickSaveBtn.addEventListener('mouseup', (e) => {
      e.stopPropagation();
    });
    
    // 添加点击事件
    quickSaveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      createSaveDialog(selectedText);
      removeQuickSaveButton();
    });
    
    // 将按钮添加到 body 的最后，确保最高层级
    document.body.appendChild(quickSaveBtn);
    
    // 清理旧的事件监听器
    mousedownListeners.forEach(listener => {
      document.removeEventListener('mousedown', listener);
    });
    mousedownListeners.clear();
    
    // 添加新的事件监听器，使用捕获阶段
    const mousedownListener = (e) => {
      if (e.target !== quickSaveBtn) {
        removeQuickSaveButton();
      }
    };
    document.addEventListener('mousedown', mousedownListener, true);
    mousedownListeners.add(mousedownListener);
    
    // 添加滚动事件监听，滚动时移除按钮
    const scrollListener = () => {
      removeQuickSaveButton();
    };
    window.addEventListener('scroll', scrollListener);
    mousedownListeners.add(scrollListener); // 使用同一个 Set 来管理
  }
}, 200);

// 使用捕获阶段来监听选中文本事件
document.addEventListener('mouseup', handleTextSelection, true);

// 移除快捷保存按钮的函数
function removeQuickSaveButton() {
  const existingBtn = document.getElementById('quick-save-btn');
  if (existingBtn) {
    existingBtn.remove();
  }
  // 清理所有事件监听器
  mousedownListeners.forEach(listener => {
    document.removeEventListener('mousedown', listener, true);
    window.removeEventListener('scroll', listener);
  });
  mousedownListeners.clear();
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSaveDialog") {
    createSaveDialog(request.text);
  }
});

// 检查是否是 PDF 查看器的函数更新
function isPDFViewer() {
  return (
    document.body.classList.contains('loadingInProgress') ||
    document.querySelector('#viewerContainer') !== null ||
    document.querySelector('embed[type="application/pdf"]') !== null ||
    location.pathname.toLowerCase().endsWith('.pdf')
  );
}

// 更新 PDF 支持设置函数
function setupPDFSupport() {
  if (!isPDFViewer()) return;

  // 等待 PDF 查看器加载完成
  const checkViewer = setInterval(() => {
    // 检查多种可能的 PDF 查看器元素
    const viewer = document.querySelector('#viewer') || 
                  document.querySelector('embed[type="application/pdf"]') ||
                  document.querySelector('#viewerContainer');
                  
    if (viewer) {
      clearInterval(checkViewer);
      console.log('PDF viewer detected and initialized');

      // 为 PDF 查看器添加特殊样式
      const style = document.createElement('style');
      style.textContent = `
        #quick-save-btn {
          font-family: system-ui, -apple-system, sans-serif !important;
          position: fixed !important;
          z-index: 2147483647 !important;
        }
        .save-dialog {
          font-family: system-ui, -apple-system, sans-serif !important;
          z-index: 2147483647 !important;
        }
        .inspiration-overlay {
          z-index: 2147483646 !important;
        }
      `;
      document.head.appendChild(style);

      // 直接在 viewer 元素上添加事件监听
      viewer.addEventListener('mouseup', handleTextSelection, true);
      document.addEventListener('mouseup', handleTextSelection, true);

      // 修改文本选择处理函数以支持 PDF
      const originalHandleTextSelection = handleTextSelection;
      window.handleTextSelection = debounce((event) => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
          console.log('Selected text in PDF:', selectedText);
          
          // 获取 PDF 文档信息
          const pdfTitle = document.title.replace(' [PDF]', '').trim();
          const pageNumber = getCurrentPDFPage();
          
          // 移除可能已存在的快捷按钮
          removeQuickSaveButton();
          
          // 创建快捷保存按钮
          const quickSaveBtn = document.createElement('div');
          quickSaveBtn.id = 'quick-save-btn';
          quickSaveBtn.innerHTML = '💡 保存灵感';
          
          // 获取选中文本的位置
          let rect;
          try {
            rect = selection.getRangeAt(0).getBoundingClientRect();
          } catch (e) {
            rect = {
              right: event.clientX || 0,
              bottom: event.clientY || 0,
              top: event.clientY || 0
            };
          }
          
          // 计算按钮位置
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const btnWidth = 100;
          const btnHeight = 36;
          
          let left = (rect.right || event.clientX) + window.scrollX;
          let top = (rect.bottom || event.clientY) + window.scrollY;
          
          if (left + btnWidth > viewportWidth) {
            left = viewportWidth - btnWidth - 10;
          }
          
          if (top + btnHeight > viewportHeight) {
            top = (rect.top + window.scrollY || top) - btnHeight - 5;
          }
          
          // 设置按钮样式和位置
          Object.assign(quickSaveBtn.style, {
            position: 'fixed',
            left: `${left}px`,
            top: `${top}px`,
            background: '#4a90e2',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            zIndex: '2147483647',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
            userSelect: 'none',
            webkitUserSelect: 'none'
          });
          
          // 添加点击事件
          quickSaveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Save button clicked for PDF content');
            
            // 创建带有 PDF 页码信息的保存对话框
            createSaveDialog(selectedText, {
              type: 'pdf',
              title: pdfTitle || 'PDF文档',
              page: pageNumber
            });
            
            removeQuickSaveButton();
          });
          
          // 阻止事件冒泡
          quickSaveBtn.addEventListener('mousedown', (e) => e.stopPropagation());
          quickSaveBtn.addEventListener('mouseup', (e) => e.stopPropagation());
          
          document.body.appendChild(quickSaveBtn);
          
          // 添加点击其他区域移除按钮的事件
          const clickOutsideListener = (e) => {
            if (e.target !== quickSaveBtn) {
              removeQuickSaveButton();
              document.removeEventListener('mousedown', clickOutsideListener, true);
            }
          };
          document.addEventListener('mousedown', clickOutsideListener, true);
        }
      }, 200);
    }
  }, 100);
}

// 获取当前 PDF 页码的函数更新
function getCurrentPDFPage() {
  const pageNumber = document.querySelector('#pageNumber');
  const pageLabel = document.querySelector('#pageLabel');
  const pdfViewer = document.querySelector('#viewer');
  
  if (pageNumber) {
    return pageNumber.value;
  } else if (pageLabel) {
    return pageLabel.textContent;
  } else if (pdfViewer) {
    const currentPage = pdfViewer.querySelector('.page[data-page-number]');
    return currentPage ? currentPage.getAttribute('data-page-number') : '1';
  }
  return '未知页码';
}

// 确保在 PDF 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPDFSupport);
} else {
  setupPDFSupport();
}

// 为了处理动态加载的 PDF，添加 URL 变化监听
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setupPDFSupport();
  }
}).observe(document, { subtree: true, childList: true }); 