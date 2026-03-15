import * as vscode from 'vscode'

/**
 * HTML 构建选项
 */
export interface HtmlOptions {
  /** 当前主题 ('dark' | 'light') */
  theme: string
  /** marked.js 的 Webview URI */
  markedUri: vscode.Uri
  /** webview.css 的 Webview URI */
  cssUri: vscode.Uri
  /** CSP 安全策略 */
  csp: string
}

/**
 * 生成 Webview HTML
 * @param options HTML 构建选项
 * @returns 完整的 HTML 字符串
 */
export function buildHtml(options: HtmlOptions): string {
  const { theme, markedUri, cssUri, csp } = options
  const isDark = theme === 'dark'

  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? 'theme-dark' : 'theme-light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  <link rel="stylesheet" href="${cssUri}">
  <script src="${markedUri}"></script>
</head>
<body>
  <div class="tabs-container">
    <div class="tabs" id="tabs">
      <div class="tab active" data-filter="all">All <span class="badge" id="badge-all">0</span></div>
      <div class="tab" data-filter="code">Code <span class="badge" id="badge-code">0</span></div>
      <div class="tab" data-filter="info">Info <span class="badge" id="badge-info">0</span></div>
    </div>
    <button class="refresh-btn" id="refreshBtn" title="Refresh results" disabled>⟳</button>
  </div>

  <div class="content" id="content">
    <div class="empty-state">
      <div class="title">Search documentation</div>
      <div class="hint">Click the search icon above or run "Context7: Search Documentation"</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let state = {
      results: [],
      loading: false,
      filter: 'all'
    };

    // Tab 点击
    document.getElementById('tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      render();
    });

    // Refresh 按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    function render() {
      const content = document.getElementById('content');
      const refreshBtn = document.getElementById('refreshBtn');

      // 更新徽章（loading 时显示 0）
      document.getElementById('badge-all').textContent = state.results.length;
      document.getElementById('badge-code').textContent = state.results.filter(r => r.type === 'code').length;
      document.getElementById('badge-info').textContent = state.results.filter(r => r.type === 'info').length;

      if (state.loading) {
        content.innerHTML = '<div class="loading"><span></span><span></span><span></span><span></span><span></span></div>';
        if (refreshBtn) refreshBtn.disabled = true;
        return;
      }

      // 只有当有搜索结果时才启用刷新按钮
      if (refreshBtn) {
        refreshBtn.disabled = state.results.length === 0;
      }

      const filtered = state.filter === 'all'
        ? state.results
        : state.results.filter(r => r.type === state.filter);

      if (filtered.length === 0) {
        const iconColor = '${isDark ? '#ffffff' : '#000000'}';
        if (state.results.length === 0) {
          content.innerHTML = \`
            <div class="empty-state">
              <div class="title">Search documentation</div>
              <div class="hint">Click the search icon above or run "Context7: Search Documentation"</div>
            </div>
          \`;
        } else {
          content.innerHTML = \`
            <div class="empty-state">
              <div class="title">No \${state.filter} results</div>
            </div>
          \`;
        }
        return;
      }

      content.innerHTML = filtered.map((r, i) => {
        const globalIndex = state.results.indexOf(r);

        // 统一渲染逻辑：content 都用 marked.parse 渲染 Markdown
        const contentHtml = r.content ? marked.parse(r.content) : '';

        // 生成源链接 HTML
        const sourceLinkHtml = r.sourceUrl
          ? \`<a class="source-link" href="\${r.sourceUrl}" title="View source" aria-label="View source">
               <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               <span class="source-text">Source</span>
             </a>\`
          : '';

        // 生成页面标题 HTML（仅代码片段有，Unknown 不显示）
        const pageTitleHtml = r.pageTitle && r.pageTitle !== 'Unknown'
          ? \`<span class="page-title">\${escapeHtml(r.pageTitle)}</span>\`
          : '';

        if (r.type === 'code') {
          return \`
            <div class="result-item">
              <div class="header">
                <div class="title">\${escapeHtml(r.title)}</div>
                <span class="type-badge code">code</span>
              </div>
              \${contentHtml ? \`<div class="info-content">\${contentHtml}</div>\` : ''}
              <div class="code-block">\${r.highlightedCode || ''}</div>
              <div class="result-footer">
                <div class="meta">
                  \${pageTitleHtml}
                  \${sourceLinkHtml}
                </div>
                <div class="actions">
                  <button onclick="copyCode(\${globalIndex}, this)" data-tooltip="Copy" aria-label="Copy code">
                    <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button onclick="insertCode(\${globalIndex})" data-tooltip="Insert" aria-label="Insert code">
                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>
            </div>
          \`;
        } else {
          return \`
            <div class="result-item">
              <div class="header">
                <div class="title">\${escapeHtml(r.title)}</div>
                <span class="type-badge info">info</span>
              </div>
              <div class="info-content">\${contentHtml}</div>
              \${sourceLinkHtml ? \`<div class="result-footer"><div class="meta">\${sourceLinkHtml}</div></div>\` : ''}
            </div>
          \`;
        }
      }).join('');
    }

    function copyCode(index, btn) {
      const code = state.results[index]?.code;
      if (code) {
        vscode.postMessage({ command: 'copyCode', code });
        if (btn) {
          btn.classList.add('copied');
          btn.dataset.tooltip = 'Copied!';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.dataset.tooltip = 'Copy';
          }, 1500);
        }
      }
    }

    function insertCode(index) {
      const code = state.results[index]?.code;
      if (code) vscode.postMessage({ command: 'insertCode', code });
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.addEventListener('message', event => {
      console.log('[Context7 Webview] Received message:', event.data);
      const message = event.data;
      switch (message.command) {
        case 'loading':
          console.log('[Context7 Webview] Showing loading state');
          state.loading = true;
          state.results = []; // 清除旧结果，避免显示过时的计数
          render();
          break;
        case 'results':
          console.log('[Context7 Webview] Received results:', message.results?.length);
          state.loading = false;
          state.results = message.results;
          render();
          break;
        case 'error':
          console.log('[Context7 Webview] Received error:', message.message);
          state.loading = false;
          content.innerHTML = \`<div class="error">\${escapeHtml(message.message)}</div>\`;
          render();
          break;
        case 'themeChanged':
          document.documentElement.className = message.theme === 'dark' ? 'theme-dark' : 'theme-light';
          break;
        case 'historyUpdate':
          break;
        case 'bookmarksUpdate':
          break;
      }
    });
  </script>
</body>
</html>`
}
