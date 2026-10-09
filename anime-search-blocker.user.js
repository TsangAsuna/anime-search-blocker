// ==UserScript==
// @name         动漫花园 / 蜜柑动画 / Nyaa 搜索结果屏蔽器（自定义规则版）
// @namespace    local.anime-search-blocker
// @version      1.2.0
// @description  在动漫花园（share.dmhy.org / animes.garden 及镜像）、蜜柑动画（mikanani.me 及镜像）、Nyaa（nyaa.si / nyaa.land / nyaa.help 及 sukebei）的搜索结果与资源列表中屏蔽指定制作组，默认屏蔽 DBD、Nix-raws、沸班亚马制作组；支持深度屏蔽（同时清空被屏蔽行的磁力/种子链接，防止任何复制带走）；右下角按钮可打开设置面板，自定义添加/删除屏蔽关键词
// @author       SAOAsuna
// @match        https://animes.garden/*
// @match        https://share.dmhy.org/*
// @match        https://mikanani.me/*
// @match        https://mikanime.tv/*
// @match        https://mikan.makura.cc/*
// @match        https://mikanani.kas.pub/*
// @match        https://nyaa.si/*
// @match        https://sukebei.nyaa.si/*
// @match        https://nyaa.land/*
// @match        https://nyaa.help/*
// @match        https://sukebei.nyaa.help/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/599396/%E5%8A%A8%E6%BC%AB%E8%8A%B1%E5%9B%AD%20%20%E8%9C%9C%E6%9F%91%E5%8A%A8%E7%94%BB%20%20Nyaa%20%E6%90%9C%E7%B4%A2%E7%BB%93%E6%9E%9C%E5%B1%8F%E8%94%BD%E5%99%A8%EF%BC%88%E8%87%AA%E5%AE%9A%E4%B9%89%E8%A7%84%E5%88%99%E7%89%88%EF%BC%89.user.js
// @updateURL    https://update.greasyfork.org/scripts/599396/%E5%8A%A8%E6%BC%AB%E8%8A%B1%E5%9B%AD%20%20%E8%9C%9C%E6%9F%91%E5%8A%A8%E7%94%BB%20%20Nyaa%20%E6%90%9C%E7%B4%A2%E7%BB%93%E6%9E%9C%E5%B1%8F%E8%94%BD%E5%99%A8%EF%BC%88%E8%87%AA%E5%AE%9A%E4%B9%89%E8%A7%84%E5%88%99%E7%89%88%EF%BC%89.meta.js
// ==/UserScript==

(function () {
  'use strict';

  const ATTR = 'data-mab-hidden';
  const STORAGE_KEY = 'mab_config_v1';
  const DEFAULT_KEYWORDS = ['DBD', 'Nix-raws', '沸班亚马制作组'];

  const DEFAULT_CONFIG = {
    enabled: true,
    keywords: DEFAULT_KEYWORDS.join('\n'),
    ignoreCase: true,
    hideFansubFilter: true,
    showBadge: true,
    deepBlock: true,
  };

  /* ---------- 配置读写 ---------- */

  function loadConfig() {
    try {
      const raw = GM_getValue(STORAGE_KEY, null);
      if (!raw) return Object.assign({}, DEFAULT_CONFIG);
      const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Object.assign({}, DEFAULT_CONFIG, saved);
    } catch (e) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
  }

  function saveConfig(cfg) {
    GM_setValue(STORAGE_KEY, JSON.stringify(cfg));
  }

  let config = loadConfig();
  let patterns = [];

  function compilePatterns() {
    patterns = config.keywords
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((kw) => {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, config.ignoreCase ? 'i' : '');
      });
  }

  function isBlockedText(text) {
    if (!text) return false;
    return patterns.some((re) => re.test(text));
  }

  /* ---------- 样式 ---------- */

  GM_addStyle(
    '[' + ATTR + '="1"]{display:none !important;}' +
      '#mab-fab{position:fixed;right:18px;bottom:18px;z-index:2147483646;' +
      'width:46px;height:46px;border:none;border-radius:50%;cursor:pointer;' +
      'background:#1f2937;color:#fff;font-size:19px;line-height:46px;text-align:center;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35);padding:0;}' +
      '#mab-fab:hover{background:#111827;}' +
      '#mab-fab .mab-count{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;' +
      'border-radius:9px;background:#ef4444;color:#fff;font-size:11px;line-height:18px;' +
      'padding:0 4px;font-weight:600;font-style:normal;}' +
      '#mab-panel{position:fixed;right:18px;bottom:76px;z-index:2147483647;width:340px;' +
      'max-width:calc(100vw - 36px);max-height:calc(100vh - 110px);overflow:auto;' +
      'box-sizing:border-box;background:#ffffff;color:#111827;border:1px solid #d1d5db;' +
      'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);' +
      'font:13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;' +
      'padding:14px 16px;display:none;}' +
      '#mab-panel.mab-open{display:block;}' +
      '#mab-panel *{box-sizing:border-box;}' +
      '#mab-panel .mab-title-row{display:flex;justify-content:space-between;align-items:center;' +
      'font-size:15px;font-weight:700;margin-bottom:10px;}' +
      '#mab-panel .mab-title-row button{border:none;background:transparent;font-size:20px;' +
      'line-height:1;cursor:pointer;color:#6b7280;padding:0 2px;}' +
      '#mab-panel .mab-title-row button:hover{color:#111827;}' +
      '#mab-panel .mab-label{margin:10px 0 4px;font-weight:600;}' +
      '#mab-panel .mab-row{display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer;}' +
      '#mab-panel textarea{width:100%;resize:vertical;min-height:96px;padding:8px;' +
      'border:1px solid #d1d5db;border-radius:8px;font:12px/1.6 Consolas,Menlo,monospace;color:#111827;}' +
      '#mab-panel input[type=text]{flex:1;min-width:0;padding:6px 8px;border:1px solid #d1d5db;' +
      'border-radius:8px;font:13px/1.4 inherit;color:#111827;}' +
      '#mab-panel .mab-quick{display:flex;gap:6px;margin:8px 0;}' +
      '#mab-panel .mab-quick button,#mab-panel .mab-actions button{' +
      'border:1px solid #d1d5db;background:#f9fafb;color:#111827;border-radius:8px;' +
      'padding:6px 10px;cursor:pointer;font:12px/1.4 inherit;white-space:nowrap;}' +
      '#mab-panel .mab-quick button:hover,#mab-panel .mab-actions button:hover{background:#e5e7eb;}' +
      '#mab-panel .mab-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}' +
      '#mab-panel .mab-actions .mab-primary{background:#2563eb;border-color:#2563eb;color:#fff;}' +
      '#mab-panel .mab-actions .mab-primary:hover{background:#1d4ed8;}' +
      '#mab-panel .mab-hint{margin-top:10px;color:#6b7280;font-size:12px;}' +
      '#mab-panel .mab-hint.mab-ok{color:#16a34a;}'
  );

  /* ---------- 站点适配（按页面结构识别，主站与镜像通用） ---------- */

  function collectTargets() {
    const items = [];
    // 动漫花园镜像站 animes.garden：资源列表每一行
    document.querySelectorAll('.resources-table-body tr').forEach((tr) => items.push(tr));
    // 蜜柑动画及其镜像：搜索结果每一行种子
    document.querySelectorAll('tr.js-search-results-row').forEach((tr) => items.push(tr));
    // 动漫花园原站 share.dmhy.org：资源列表每一行
    document.querySelectorAll('#topic_list tbody tr').forEach((tr) => items.push(tr));
    // nyaa 系（nyaa.si / nyaa.land / nyaa.help / sukebei）：种子列表行（排除表头）
    document.querySelectorAll('table.torrent-list tr').forEach((tr) => {
      if (tr.querySelector('a[href*="/view/"]')) items.push(tr);
    });
    // animes.garden 顶部导航「字幕组」筛选下拉项
    if (config.hideFansubFilter) {
      document.querySelectorAll('.nav-fansubs .c-dropdown a[href*="fansub="]').forEach((a) => items.push(a));
    }
    return items;
  }

  /* ---------- 扫描与隐藏 ---------- */

  // 深度屏蔽：清空行内磁力/种子下载链接与剪贴板文本，原值暂存在 data 属性里以便还原
  const LINK_HREF_RE = /magnet:|\.torrent|keepshare/i;
  const CLIP_RE = /magnet:/i;

  function stripRowLinks(row) {
    row.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (LINK_HREF_RE.test(href)) {
        if (!a.hasAttribute('data-mab-orig-href')) {
          a.setAttribute('data-mab-orig-href', href);
        }
        a.setAttribute('href', '#');
      }
    });
    row.querySelectorAll('[data-clipboard-text]').forEach((el) => {
      const text = el.getAttribute('data-clipboard-text') || '';
      if (CLIP_RE.test(text)) {
        if (!el.hasAttribute('data-mab-orig-clip')) {
          el.setAttribute('data-mab-orig-clip', text);
        }
        el.setAttribute('data-clipboard-text', '');
      }
    });
  }

  function restoreRowLinks(row) {
    row.querySelectorAll('[data-mab-orig-href]').forEach((a) => {
      a.setAttribute('href', a.getAttribute('data-mab-orig-href'));
      a.removeAttribute('data-mab-orig-href');
    });
    row.querySelectorAll('[data-mab-orig-clip]').forEach((el) => {
      el.setAttribute('data-clipboard-text', el.getAttribute('data-mab-orig-clip'));
      el.removeAttribute('data-mab-orig-clip');
    });
  }

  let hiddenCount = 0;

  function rescan() {
    document.querySelectorAll('[' + ATTR + ']').forEach((el) => {
      el.removeAttribute(ATTR);
      restoreRowLinks(el);
    });
    if (!config.enabled || patterns.length === 0) {
      hiddenCount = 0;
      updateBadge();
      return;
    }
    let count = 0;
    for (const el of collectTargets()) {
      if (isBlockedText(el.textContent || '')) {
        el.setAttribute(ATTR, '1');
        if (config.deepBlock) stripRowLinks(el);
        count++;
      }
    }
    hiddenCount = count;
    updateBadge();
  }

  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      rescan();
    }, 80);
  }

  /* ---------- 设置面板 ---------- */

  let panel, fab, countEl, enabledEl, keywordsEl, caseEl, filterEl, badgeEl, deepEl, statusEl;

  function injectUI() {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="mab-panel" role="dialog" aria-label="屏蔽规则设置">' +
        '<div class="mab-title-row"><span>🚫 屏蔽规则设置</span><button id="mab-close" title="关闭">×</button></div>' +
        '<label class="mab-row"><input type="checkbox" id="mab-enabled"> 启用屏蔽</label>' +
        '<div class="mab-label">屏蔽关键词（每行一条，标题或制作组包含该文字即屏蔽）</div>' +
        '<textarea id="mab-keywords" spellcheck="false"></textarea>' +
        '<div class="mab-quick"><input type="text" id="mab-quick-input" placeholder="快速添加关键词…"><button id="mab-quick-add">添加</button></div>' +
        '<label class="mab-row"><input type="checkbox" id="mab-case"> 忽略大小写（Nix-raws 同时匹配 Nix-Raws）</label>' +
        '<label class="mab-row"><input type="checkbox" id="mab-deep"> 深度屏蔽：同时清空被屏蔽行的磁力/种子链接（防止复制带走）</label>' +
        '<label class="mab-row"><input type="checkbox" id="mab-filter"> 同时隐藏「字幕组」筛选下拉条目（动漫花园）</label>' +
        '<label class="mab-row"><input type="checkbox" id="mab-badge"> 在按钮上显示屏蔽计数</label>' +
        '<div class="mab-actions">' +
        '<button id="mab-save" class="mab-primary">保存并应用</button>' +
        '<button id="mab-rescan">立即扫描</button>' +
        '<button id="mab-reset">恢复默认</button>' +
        '</div>' +
        '<div class="mab-hint" id="mab-status"></div>' +
        '</div>' +
        '<button id="mab-fab" title="屏蔽规则设置">🚫<i class="mab-count" hidden></i></button>'
    );

    panel = document.getElementById('mab-panel');
    fab = document.getElementById('mab-fab');
    countEl = fab.querySelector('.mab-count');
    enabledEl = document.getElementById('mab-enabled');
    keywordsEl = document.getElementById('mab-keywords');
    caseEl = document.getElementById('mab-case');
    deepEl = document.getElementById('mab-deep');
    filterEl = document.getElementById('mab-filter');
    badgeEl = document.getElementById('mab-badge');
    statusEl = document.getElementById('mab-status');

    fab.addEventListener('click', () => {
      if (panel.classList.contains('mab-open')) {
        panel.classList.remove('mab-open');
      } else {
        fillPanel();
        panel.classList.add('mab-open');
      }
    });
    document.getElementById('mab-close').addEventListener('click', () => panel.classList.remove('mab-open'));
    document.getElementById('mab-save').addEventListener('click', () => {
      applyPanel(true);
    });
    document.getElementById('mab-rescan').addEventListener('click', () => {
      rescan();
      setStatus('已重新扫描，本页屏蔽 ' + hiddenCount + ' 项', true);
    });
    document.getElementById('mab-reset').addEventListener('click', () => {
      if (!confirm('恢复默认关键词与设置？')) return;
      config = Object.assign({}, DEFAULT_CONFIG);
      saveConfig(config);
      compilePatterns();
      fillPanel();
      rescan();
      setStatus('已恢复默认设置', true);
    });
    document.getElementById('mab-quick-add').addEventListener('click', quickAdd);
    document.getElementById('mab-quick-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') quickAdd();
    });

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('屏蔽规则设置', () => {
        fillPanel();
        panel.classList.add('mab-open');
      });
    }
  }

  function quickAdd() {
    const input = document.getElementById('mab-quick-input');
    const kw = input.value.trim();
    if (!kw) return;
    const lines = keywordsEl.value.split(/\r?\n/).map((s) => s.trim());
    if (lines.some((l) => l.toLowerCase() === kw.toLowerCase())) {
      setStatus('该关键词已存在', false);
      input.value = '';
      return;
    }
    keywordsEl.value = keywordsEl.value.trim() ? keywordsEl.value.replace(/\s*$/, '') + '\n' + kw : kw;
    input.value = '';
    applyPanel(true);
  }

  function applyPanel(persist) {
    config = {
      enabled: enabledEl.checked,
      keywords: keywordsEl.value,
      ignoreCase: caseEl.checked,
      hideFansubFilter: filterEl.checked,
      showBadge: badgeEl.checked,
      deepBlock: deepEl.checked,
    };
    if (persist) saveConfig(config);
    compilePatterns();
    rescan();
    setStatus('已保存并应用，本页屏蔽 ' + hiddenCount + ' 项', true);
  }

  function fillPanel() {
    enabledEl.checked = config.enabled;
    keywordsEl.value = config.keywords;
    caseEl.checked = config.ignoreCase;
    filterEl.checked = config.hideFansubFilter;
    badgeEl.checked = config.showBadge;
    deepEl.checked = config.deepBlock;
    setStatus('共 ' + patterns.length + ' 条关键词 · 本页已屏蔽 ' + hiddenCount + ' 项', false);
  }

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('mab-ok', !!ok);
  }

  function updateBadge() {
    if (config.showBadge && config.enabled && hiddenCount > 0) {
      countEl.textContent = String(hiddenCount);
      countEl.hidden = false;
    } else {
      countEl.hidden = true;
    }
  }

  /* ---------- 启动 ---------- */

  compilePatterns();
  injectUI();
  rescan();
  new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
})();
