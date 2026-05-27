/**
 * 历史搜索增强 UI 模块
 *
 * 在 CC98 搜索框下方注入本地历史匹配下拉面板。
 * 用户输入搜索词时并行匹配本地历史记录（模糊匹配标题+作者），
 * 效果类似于搜索引擎的搜索建议。
 */
import { createElement, injectCSS, waitForElement } from "../../core/dom";
import type { HistoryItem } from "../../types";
import { Storage } from "../../core/storage";

const OVERLAY_ID = "cc98-history-overlay";

/** 覆盖层 UI 样式 */
const STYLES = `
#${OVERLAY_ID} {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 320px;
  overflow-y: auto;
  display: none !important;
  width: 100%;
  box-sizing: border-box;
}
#${OVERLAY_ID}.open {
  display: block !important;
}
#${OVERLAY_ID} .cc98-history-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#${OVERLAY_ID} .cc98-history-item:hover {
  background: var(--cc98-primary-bg, #f0f5ff);
}
#${OVERLAY_ID} .cc98-history-item:last-child {
  border-bottom: none;
}
#${OVERLAY_ID} .cc98-history-title {
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
#${OVERLAY_ID} .cc98-history-author {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
  flex-shrink: 0;
}
#${OVERLAY_ID} .cc98-history-board {
  color: #bbb;
  font-size: 11px;
  margin-left: 4px;
  flex-shrink: 0;
}
#${OVERLAY_ID} .cc98-history-empty {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
#${OVERLAY_ID} .cc98-history-header {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--cc98-text-on-primary, #fff);
  background: var(--cc98-primary, #394676);
  border-bottom: 1px solid transparent;
}
`;

/** 内存缓存 —— tracker 写入后会通过事件刷新 */
let cachedHistory: HistoryItem[] = [];

async function refreshCache(): Promise<void> {
  cachedHistory = (await Storage.getHistory()) ?? [];
}

/**
 * 自由模糊匹配：将 query 分词后（中文连续块 + 英文/数字连续块），
 * 每个 token 都必须至少命中 item 的一个字符串字段（AND 逻辑）。
 * 跨字段、乱序、子串匹配均支持。
 */
function flexibleFuzzyMatch(item: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const fieldValues = Object.values(item)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.toLowerCase());

  const tokens = q.match(/[\u4e00-\u9fa5]+|[a-zA-Z0-9]+/g) || [q];

  return tokens.every((token) =>
    fieldValues.some((fv) => fv.includes(token)),
  );
}

/** 从缓存搜索，短路终止的 top-10 */
function topMatches(query: string, limit = 10): HistoryItem[] {
  const result: HistoryItem[] = [];
  for (const h of cachedHistory) {
    if (flexibleFuzzyMatch(h, query)) {
      result.push(h);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** 在搜索框下方构建历史匹配覆盖层 */
function buildOverlay(searchBox: HTMLInputElement): void {
  const existing = document.getElementById(OVERLAY_ID);
  existing?.remove();

  const boxContainer = (searchBox.closest(".box") || searchBox.parentElement) as HTMLElement | null;
  if (!boxContainer) return;
  boxContainer.style.position = "relative";

  const overlay = createElement("div", { id: OVERLAY_ID }) as HTMLDivElement;
  boxContainer.appendChild(overlay);

  let lastQuery = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let selectedIndex = -1;
  let resultItems: HistoryItem[] = [];

  function renderResults(matched: HistoryItem[]): void {
    resultItems = matched;
    selectedIndex = -1;
    overlay.innerHTML = "";

    if (matched.length === 0) {
      overlay.innerHTML = `<div class="cc98-history-empty">本地无匹配记录</div>`;
      overlay.classList.add("open");
      return;
    }

    const header = createElement("div", { className: "cc98-history-header" }, `本地历史 (${matched.length})`);
    overlay.appendChild(header);

    for (const item of matched) {
      const row = createElement("div", { className: "cc98-history-item" });
      const title = createElement("span", { className: "cc98-history-title" }, item.title);
      const meta = createElement("span", { style: "display:flex;align-items:center;flex-shrink:0;" });
      if (item.board) {
        meta.append(createElement("span", { className: "cc98-history-board" }, item.board));
      }
      meta.append(createElement("span", { className: "cc98-history-author" }, item.author));
      row.append(title, meta);
      row.addEventListener("click", () => { window.location.href = item.url; });
      overlay.appendChild(row);
    }

    overlay.classList.add("open");
    console.log("[CC98 Live Better] search: showing", matched.length, "results");
  }

  function highlightItem(idx: number): void {
    const rows = overlay.querySelectorAll<HTMLElement>(".cc98-history-item");
    rows.forEach((r) => r.style.removeProperty("background"));
    if (idx >= 0 && idx < rows.length) {
      rows[idx].style.background = "var(--cc98-primary-bg, #eef0f7)";
      rows[idx].scrollIntoView({ block: "nearest" });
    }
  }

  searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (query.length < 1) { overlay.classList.remove("open"); return; }
    debounceTimer = setTimeout(() => {
      if (query === lastQuery) return;
      lastQuery = query;
      renderResults(topMatches(query));
    }, 250);
  });

  // 用 document capture 阶段拦截键盘事件，确保在 CC98 React/jQuery 之前执行
  document.addEventListener("keydown", (e) => {
    if (document.activeElement !== searchBox) return;
    const rows = overlay.querySelectorAll<HTMLElement>(".cc98-history-item");
    if (rows.length === 0) return;

    if (e.key === "ArrowDown") {
      e.stopPropagation();
      selectedIndex = Math.min(selectedIndex + 1, rows.length - 1);
      highlightItem(selectedIndex);
    } else if (e.key === "ArrowUp") {
      e.stopPropagation();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      highlightItem(selectedIndex);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.stopPropagation();
      window.location.href = resultItems[selectedIndex].url;
    } else if (e.key === "Escape") {
      overlay.classList.remove("open");
    }
  }, { capture: true });

  searchBox.addEventListener("blur", () => {
    setTimeout(() => overlay.classList.remove("open"), 200);
  });

  searchBox.addEventListener("focus", () => {
    if (overlay.children.length > 0) overlay.classList.add("open");
  });
}

/** 注册全局快捷键：按下 "/" 聚焦搜索框（类似 GitHub） */
function installSearchShortcut(): void {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/") return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
    if (!document.querySelector("#searchText")) return; // 搜索框尚未渲染时放行
    e.preventDefault();
    e.stopPropagation();
    // setTimeout 绕过 React 后续渲染抢焦点
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("#searchText");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }, { capture: true });
}

/** 初始化搜索覆盖层：加载缓存 + 等待搜索框出现 + 注册刷新事件 */
export async function initSearchOverlay(): Promise<void> {
  injectCSS(STYLES);

  installSearchShortcut();

  await refreshCache();

  // tracker 写入后直接通知刷新
  window.addEventListener("cc98-history-updated", refreshCache);

  // SPA 路由变化后延迟刷新（等 tracker 写入完成）
  window.addEventListener("cc98-url-change", () => setTimeout(refreshCache, 800));

  // 跨标签页同步
  chrome.storage.onChanged.addListener((changes) => {
    if (changes["cc98-live-better:history"]) refreshCache();
  });

  const searchBox = await waitForElement("#searchText", 15000);
  if (!searchBox || !(searchBox instanceof HTMLInputElement)) {
    console.log("[CC98 Live Better] search: #searchText not found, skipping");
    return;
  }

  console.log("[CC98 Live Better] search: building overlay, cache has", cachedHistory.length, "records");
  buildOverlay(searchBox);

  const observer = new MutationObserver(() => {
    const freshBox = document.querySelector<HTMLInputElement>("#searchText");
    if (freshBox && freshBox !== searchBox) {
      buildOverlay(freshBox);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
