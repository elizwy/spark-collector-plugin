// 按日期对段落进行分组
function groupSnippetsByDate(snippets) {
  const groups = {};
  snippets.forEach(snippet => {
    const date = new Date(snippet.date).toLocaleDateString('zh-CN');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(snippet);
  });
  return groups;
}

// 加载并显示所有保存的段落
function loadSnippets() {
  chrome.storage.local.get(['snippets'], (result) => {
    const snippets = result.snippets || [];
    const container = document.getElementById('snippets');
    container.innerHTML = '';
    
    // 按日期分组
    const groupedSnippets = groupSnippetsByDate(snippets);
    
    // 按日期倒序排列
    Object.keys(groupedSnippets)
      .sort((a, b) => new Date(b) - new Date(a))
      .forEach(date => {
        // 创建日期组
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // 创建日期标题和删除按钮
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerHTML = `
          <h2>${date}</h2>
          <button class="delete-date" data-date="${date}">删除此日期</button>
        `;
        dateGroup.appendChild(dateHeader);
        
        // 添加该日期下的所有段落
        groupedSnippets[date].forEach(snippet => {
          const element = document.createElement('div');
          element.className = 'snippet';
          element.innerHTML = `
            <div class="snippet-content">${snippet.text}</div>
            <div class="snippet-meta">
              <div>来源：<a href="${snippet.url}" target="_blank">${snippet.title}</a></div>
              <div>保存时间：${new Date(snippet.date).toLocaleTimeString()}</div>
              ${snippet.notes ? `<div>笔记：${snippet.notes}</div>` : ''}
            </div>
            <div class="tags">
              ${snippet.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          `;
          dateGroup.appendChild(element);
        });
        
        container.appendChild(dateGroup);
      });
  });
}

// 删除指定日期的所有段落
function deleteSnippetsByDate(targetDate) {
  chrome.storage.local.get(['snippets'], (result) => {
    const snippets = result.snippets || [];
    const filteredSnippets = snippets.filter(snippet => {
      const snippetDate = new Date(snippet.date).toLocaleDateString('zh-CN');
      return snippetDate !== targetDate;
    });
    chrome.storage.local.set({ snippets: filteredSnippets }, () => {
      loadSnippets();
    });
  });
}

// 删除所有段落
function deleteAllSnippets() {
  if (confirm('确定要删除所有保存的内容吗？此操作不可恢复。')) {
    chrome.storage.local.set({ snippets: [] }, () => {
      loadSnippets();
    });
  }
}

// 格式化导出数据
function formatExportData(snippets) {
  let exportText = '# 我的灵感收藏\n\n';
  
  // 按日期分组
  const groupedSnippets = groupSnippetsByDate(snippets);
  
  // 按日期倒序排列
  Object.keys(groupedSnippets)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(date => {
      exportText += `## ${date}\n\n`;
      
      // 添加该日期下的所有段落
      groupedSnippets[date].forEach(snippet => {
        // 添加内容
        exportText += `### 收藏内容\n${snippet.text}\n\n`;
        
        // 添加来源
        exportText += `**来源：** ${snippet.title}\n`;
        exportText += `**链接：** ${snippet.url}\n`;
        exportText += `**时间：** ${new Date(snippet.date).toLocaleString('zh-CN')}\n`;
        
        // 如果是 PDF，添加 PDF 信息
        if (snippet.source && snippet.source.type === 'pdf') {
          exportText += `**PDF页码：** 第${snippet.source.page}页\n`;
        }
        
        // 添加标签
        if (snippet.tags && snippet.tags.length > 0) {
          exportText += `**标签：** ${snippet.tags.join(', ')}\n`;
        }
        
        // 添加笔记
        if (snippet.notes) {
          exportText += `\n**笔记：**\n${snippet.notes}\n`;
        }
        
        exportText += '\n---\n\n';
      });
    });
    
  return exportText;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSnippets();
  
  // 添加删除所有按钮
  const deleteAllBtn = document.createElement('button');
  deleteAllBtn.id = 'deleteAll';
  deleteAllBtn.textContent = '删除所有';
  deleteAllBtn.className = 'danger-button';
  document.querySelector('.filters').appendChild(deleteAllBtn);
  
  // 绑定删除事件
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-date')) {
      const date = e.target.dataset.date;
      if (confirm(`确定要删除 ${date} 的所有内容吗？`)) {
        deleteSnippetsByDate(date);
      }
    }
  });
  
  // 绑定删除所有事件
  document.getElementById('deleteAll').addEventListener('click', deleteAllSnippets);
  
  // 更新导出功能
  document.getElementById('export').addEventListener('click', () => {
    chrome.storage.local.get(['snippets'], (result) => {
      const snippets = result.snippets || [];
      
      // 创建导出选项按钮
      const exportOptions = document.createElement('div');
      exportOptions.className = 'export-options';
      exportOptions.innerHTML = `
        <div class="export-overlay">
          <div class="export-dialog">
            <h3>选择导出格式</h3>
            <button id="exportMarkdown">Markdown 格式</button>
            <button id="exportJSON">JSON 格式</button>
            <button id="exportTXT">纯文本格式</button>
            <button id="cancelExport">取消</button>
          </div>
        </div>
      `;
      
      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .export-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .export-dialog {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .export-dialog h3 {
          margin: 0 0 15px 0;
        }
        
        .export-dialog button {
          display: block;
          width: 100%;
          padding: 8px;
          margin: 8px 0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .export-dialog button:hover {
          background: #f0f0f0;
        }
        
        #exportMarkdown {
          background: #4a90e2;
          color: white;
        }
        
        #exportJSON {
          background: #67c23a;
          color: white;
        }
        
        #exportTXT {
          background: #909399;
          color: white;
        }
        
        #cancelExport {
          background: #f56c6c;
          color: white;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(exportOptions);
      
      // 绑定导出事件
      document.getElementById('exportMarkdown').addEventListener('click', () => {
        const exportText = formatExportData(snippets);
        downloadFile(exportText, 'inspirations.md', 'text/markdown');
        exportOptions.remove();
      });
      
      document.getElementById('exportJSON').addEventListener('click', () => {
        const jsonText = JSON.stringify(snippets, null, 2);
        downloadFile(jsonText, 'inspirations.json', 'application/json');
        exportOptions.remove();
      });
      
      document.getElementById('exportTXT').addEventListener('click', () => {
        let txtContent = '';
        snippets.forEach(snippet => {
          txtContent += `内容：${snippet.text}\n`;
          txtContent += `来源：${snippet.title}\n`;
          if (snippet.notes) {
            txtContent += `笔记：${snippet.notes}\n`;
          }
          txtContent += `时间：${new Date(snippet.date).toLocaleString('zh-CN')}\n`;
          txtContent += '------------------------\n\n';
        });
        downloadFile(txtContent, 'inspirations.txt', 'text/plain');
        exportOptions.remove();
      });
      
      document.getElementById('cancelExport').addEventListener('click', () => {
        exportOptions.remove();
      });
      
      // 点击遮罩层关闭
      exportOptions.addEventListener('click', (e) => {
        if (e.target === exportOptions.querySelector('.export-overlay')) {
          exportOptions.remove();
        }
      });
    });
  });
});

// 下载文件的辅助函数
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
} 