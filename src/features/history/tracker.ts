/**
 * 浏览历史跟踪模块
 *
 * 通过拦截 SPA 路由变化 + 监听 popstate 事件，
 * 在用户访问帖子页面时自动记录历史。
 * CC98 使用 React Router，页面跳转不会触发整页刷新，
 * 故需要 monkey-patch history.pushState/replaceState。
 */
import type { HistoryItem } from "../../types";
import { Storage } from "../../core/storage";
import { waitForElement } from "../../core/dom";

/** 最大保留历史条数，FIFO 淘汰 */
const MAX_ITEMS = 5000;

/** 从当前 URL 中提取帖子 ID（匹配 /topic/{id}） */
export function getCurrentTopicId(): string | null {
  const match = location.pathname.match(/^\/topic\/(\d+)/);
  return match ? match[1] : null;
}

/** 从页面中提取帖子标题 */
function extractTopicTitle(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (meta?.content) return meta.content;

  const title = document.title
    .replace(/ - CC98论坛$/, "")
    .replace(/^CC98论坛\s*/, "");
  if (title && title !== "CC98论坛") return title;

  const h1 = document.querySelector<HTMLElement>(
    '[class*="topic"] h1, [class*="Topic"] h1, .topic-title, [class*="title"]'
  );
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  return "未知帖子";
}

/** 从页面中提取楼主（OP）用户名 */
function extractAuthor(): string | null {
  // 楼主回复是 id="1" 的 .reply 容器中的用户名链接
  // 不使用全局 a[href*="/user/"] 兜底 —— 页脚也有用户链接（"雕塑流年"），会误取
  const el = document.querySelector<HTMLAnchorElement>(
    'div.reply[id="1"] a.userMessage-userName'
  );
  return el?.textContent?.trim() ?? null;
}

/** 捕获当前页面数据（仅在帖子页面有效） */
export function captureCurrentPage(): HistoryItem | null {
  const topicId = getCurrentTopicId();
  if (!topicId) return null;

  const title = extractTopicTitle();
  // 标题无效则返回 null，避免用 "未知帖子" 覆盖已有有效记录
  if (!title || title === "未知帖子" || title === "CC98论坛") return null;

  return {
    title,
    author: extractAuthor() ?? "未知",
    url: `/topic/${topicId}`,
    timestamp: Date.now(),
  };
}

/** 记录当前页面到历史：等待页面渲染完成后提取数据 */
export async function trackCurrentPage(): Promise<void> {
  const topicId = getCurrentTopicId();
  if (!topicId) return;

  // 等待楼主用户名出现
  const authorEl = await waitForElement<HTMLAnchorElement>(
    'div.reply[id="1"] a.userMessage-userName',
    10000
  );
  if (!authorEl?.textContent?.trim()) return;

  const item = captureCurrentPage();
  if (!item) return;

  const history = (await Storage.getHistory()) ?? [];
  const existingIndex = history.findIndex((h) => h.url === item.url);

  if (existingIndex >= 0) {
    const existing = history[existingIndex];
    if (item.title === "未知帖子" && existing.title !== "未知帖子") return;
    history[existingIndex] = item;
  } else {
    history.unshift(item);
  }

  if (history.length > MAX_ITEMS) history.length = MAX_ITEMS;

  await Storage.setHistory(history);

  // 通知 search-ui 刷新缓存
  window.dispatchEvent(new CustomEvent("cc98-history-updated"));
}

function patchHistoryAPI(): void {
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new CustomEvent("cc98-url-change"));
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new CustomEvent("cc98-url-change"));
    return result;
  };
}

/** 初始化历史跟踪器 */
export function initHistoryTracker(): void {
  patchHistoryAPI();

  window.addEventListener("popstate", () => trackCurrentPage());
  window.addEventListener("cc98-url-change", () => trackCurrentPage());

  // 首次加载：trackCurrentPage 内部会等待元素出现，不再依赖固定 timeout
  trackCurrentPage();
}
