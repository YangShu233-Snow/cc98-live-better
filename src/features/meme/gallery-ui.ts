/**
 * 表情包面板 UI 模块
 *
 * 在 CC98 编辑器已有的 ubb-emoji 表情面板中添加"收藏"标签页，
 * 面板结构：
 *   .ubb-emoji
 *     .ubb-emoji-buttons  → 新增 <button>收藏</button>
 *     .ubb-emoji-content  → 新增收藏内容网格
 */
import { injectCSS } from "../../core/dom";
import { getAllMemes, removeMeme } from "./storage";

const TAB_NAME = "收藏";

/** 收藏网格的样式，沿用 CC98 表情面板的视觉风格 */
const STYLES = `
.cc98-meme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px;
}

.cc98-meme-item {
  position: relative;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cc98-meme-item:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}
.cc98-meme-item img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.cc98-meme-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.cc98-meme-item:hover .cc98-meme-del {
  display: flex;
}

.cc98-meme-empty {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
`;

/**
 * 将文本插入到编辑器当前光标位置
 * 兼容 textarea、contentEditable 和 React 受控组件
 */
function insertIntoEditor(text: string): void {
  const active = document.activeElement;

  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    const start = active.selectionStart ?? active.value.length;
    const end = active.selectionEnd ?? start;
    active.value = active.value.slice(0, start) + text + active.value.slice(end);
    active.selectionStart = active.selectionEnd = start + text.length;
    active.dispatchEvent(new Event("input", { bubbles: true }));
    active.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const activeEl = active instanceof HTMLElement ? active : null;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && activeEl?.isContentEditable) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    activeEl.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  const editor = document.querySelector<HTMLTextAreaElement>(
    "textarea.ubb-editor, textarea[name='content'], .ubb-editor textarea, [contenteditable='true']"
  );
  if (editor) {
    editor.focus();
    const start = editor.selectionStart ?? editor.value.length;
    editor.value = editor.value.slice(0, start) + text + editor.value.slice(start);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/** 在指定容器内渲染表情网格 */
async function renderGrid(container: HTMLElement): Promise<void> {
  const memes = await getAllMemes();
  container.innerHTML = "";

  if (memes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cc98-meme-empty";
    empty.textContent = "还没有收藏的表情，右键论坛图片可收藏";
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "cc98-meme-grid";

  for (const meme of memes) {
    const item = document.createElement("div");
    item.className = "cc98-meme-item";

    const img = document.createElement("img");
    img.src = meme.url;
    img.alt = meme.name;
    img.loading = "lazy";

    const del = document.createElement("button");
    del.className = "cc98-meme-del";
    del.title = "删除";
    del.textContent = "✕";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      await removeMeme(meme.id);
      renderGrid(container);
    });

    item.addEventListener("click", () => {
      insertIntoEditor(`[img]${meme.url}[/img]`);
    });

    item.append(img, del);
    grid.appendChild(item);
  }

  container.appendChild(grid);
}

/**
 * 注入"收藏"标签页到 CC98 的 ubb-emoji 面板
 *
 * 匹配 CC98 原生的标签切换机制：
 * - 按钮：<button class="ubb-emoji-button">收藏</button>
 * - 内容区：<div class="ubb-emoji-content ubb-emoji-content-cc98-custom">
 */
function injectIntoEmojiPanel(): void {
  const btnContainer = document.querySelector(".ubb-emoji-buttons");
  const emojiContainer = document.querySelector(".ubb-emoji");
  if (!btnContainer || !emojiContainer) return;
  if (btnContainer.querySelector(`[data-cc98-meme]`)) return;

  const contentClass = "ubb-emoji-content-cc98-custom";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ubb-emoji-button";
  btn.dataset.cc98Meme = "tab";
  btn.textContent = TAB_NAME;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;height:0";

  const content = document.createElement("div");
  content.className = `ubb-emoji-content ${contentClass}`;
  Object.assign(content.style, {
    position: "absolute",
    bottom: "0",
    left: "0",
    width: "100%",
    height: "18rem",
    backgroundColor: "#fff",
    display: "none",
    zIndex: "999",
    overflowY: "auto",
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    btnContainer.querySelectorAll("button").forEach((b) => {
      b.classList.remove("ubb-emoji-button-active");
    });
    btn.classList.add("ubb-emoji-button-active");
    content.style.display = "block";
    renderGrid(content);
  });

  btnContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "BUTTON") return;
    if (target === btn || target.dataset.cc98Meme) return;
    content.style.display = "none";
    btn.classList.remove("ubb-emoji-button-active");
  });

  btnContainer.appendChild(btn);
  wrapper.appendChild(content);
  emojiContainer.appendChild(wrapper);
}

/** 启动 observer，检测到 .ubb-emoji 出现时注入收藏标签 */
export function initMemeObserver(): void {
  injectCSS(STYLES);

  const observer = new MutationObserver(() => {
    if (document.querySelector(".ubb-emoji")) {
      injectIntoEmojiPanel();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
