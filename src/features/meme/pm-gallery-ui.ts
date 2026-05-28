import { injectCSS, createElement } from "../../core/dom";
import { STYLES, renderGrid } from "./gallery-ui";
import { insertIntoEditor } from "./gallery-ui";
import { EMOJI_GROUPS } from "../emoji/data";
import type { EmojiGroup } from "../emoji/data";

const LOG = "[CC98 Live Better v1.0.0-beta.1][pm-meme]";
const POST_CONTENT_SELECTOR = "#postContent";
const PM_POST_AREA_SELECTOR = ".message-message-wPost";
const PM_BUTTON_AREA_SELECTOR = ".message-message-wPostBtn-wrapper";
const PM_OVERLAY_SELECTOR = "[data-cc98-meme-pm-overlay]";
const PM_BUTTON_SELECTOR = "[data-cc98-meme-pm-btn]";

const PANEL_STYLES = `
.cc98-meme-pm-overlay {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  z-index: 999;
  display: none;
}
.cc98-meme-pm-overlay.open {
  display: block;
}

.cc98-pm-emoji-panel {
  height: 18rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px 6px 0 0;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.cc98-pm-emoji-buttons {
  display: flex;
  flex-shrink: 0;
  overflow-x: auto;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  border-radius: 6px 6px 0 0;
}
.cc98-pm-emoji-buttons::-webkit-scrollbar { height: 0; }

.cc98-pm-emoji-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}
.cc98-pm-emoji-btn:hover { color: #333; }
.cc98-pm-emoji-btn.active {
  color: #1677ff;
  border-bottom: 2px solid #1677ff;
}

.cc98-pm-emoji-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.cc98-pm-emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}
.cc98-pm-emoji-grid img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px;
}
.cc98-pm-emoji-grid img:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}

.cc98-meme-pm-btn {
  margin-right: 10px;
}
`;

function renderEmojiTab(content: HTMLElement, group: EmojiGroup): void {
  content.innerHTML = "";
  const grid = createElement("div", { className: "cc98-pm-emoji-grid" });
  for (const item of group.items) {
    const img = createElement("img", { src: item.url, loading: "lazy" });
    img.addEventListener("click", () => insertIntoEditor(item.ubb));
    grid.appendChild(img);
  }
  content.appendChild(grid);
}

async function renderCustomTab(content: HTMLElement): Promise<void> {
  await renderGrid(content);
}

function buildPanel(): HTMLElement {
  const panel = createElement("div", { className: "cc98-pm-emoji-panel" });
  const btnBar = createElement("div", { className: "cc98-pm-emoji-buttons" });
  const content = createElement("div", { className: "cc98-pm-emoji-content" });

  function switchTab(id: string): void {
    btnBar.querySelectorAll(".cc98-pm-emoji-btn").forEach((b) => b.classList.remove("active"));
    const btn = btnBar.querySelector<HTMLElement>(`[data-pm-tab="${id}"]`);
    if (btn) btn.classList.add("active");

    content.innerHTML = "";
    if (id === "__custom__") {
      renderCustomTab(content);
    } else {
      const group = EMOJI_GROUPS.find((g) => g.id === id);
      if (group) renderEmojiTab(content, group);
    }
  }

  for (const group of EMOJI_GROUPS) {
    const btn = createElement("button", {
      className: "cc98-pm-emoji-btn",
      "data-pm-tab": group.id,
    }, group.name);
    btn.addEventListener("click", (e) => { e.stopPropagation(); switchTab(group.id); });
    btnBar.appendChild(btn);
  }

  const customBtn = createElement("button", {
    className: "cc98-pm-emoji-btn",
    "data-pm-tab": "__custom__",
  }, "收藏");
  customBtn.addEventListener("click", (e) => { e.stopPropagation(); switchTab("__custom__"); });
  btnBar.appendChild(customBtn);

  panel.appendChild(btnBar);
  panel.appendChild(content);
  switchTab(EMOJI_GROUPS[0].id);
  return panel;
}

function ensureOverlay(postArea: HTMLElement): HTMLElement {
  let overlay = postArea.querySelector<HTMLElement>(PM_OVERLAY_SELECTOR);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "cc98-meme-pm-overlay";
    overlay.dataset.cc98MemePmOverlay = "";
    overlay.appendChild(buildPanel());
    postArea.appendChild(overlay);
  } else if (!overlay.querySelector(".cc98-pm-emoji-panel")) {
    overlay.appendChild(buildPanel());
  }

  postArea.style.position = "relative";
  return overlay;
}

function ensurePMInjection(): void {
  const textarea = document.querySelector<HTMLTextAreaElement>(POST_CONTENT_SELECTOR);
  if (!textarea) return;

  const postArea = textarea.closest<HTMLElement>(PM_POST_AREA_SELECTOR);
  if (!postArea) return;

  const btnArea = postArea.querySelector<HTMLElement>(PM_BUTTON_AREA_SELECTOR);
  if (!btnArea) return;

  const overlay = ensureOverlay(postArea);
  if (btnArea.querySelector(PM_BUTTON_SELECTOR)) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "message-message-wPostBtn cc98-meme-pm-btn";
  btn.dataset.cc98MemePmBtn = "";
  btn.textContent = "表情";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const ta = document.querySelector<HTMLTextAreaElement>(POST_CONTENT_SELECTOR);
    if (!ta) return;
    if (document.activeElement !== ta) ta.focus();
    overlay.classList.toggle("open");
  });
  btnArea.insertBefore(btn, btnArea.firstChild);

  console.log(`${LOG} ensurePMInjection: button inserted`);
}

export function initPMInjection(): void {
  injectCSS(STYLES + PANEL_STYLES);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleEnsure = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(ensurePMInjection, 50);
  };

  ensurePMInjection();

  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(`${PM_BUTTON_SELECTOR}, ${PM_OVERLAY_SELECTOR}`)) {
      document.querySelectorAll(PM_OVERLAY_SELECTOR).forEach((overlay) => {
        overlay.classList.remove("open");
      });
    }
  }, { capture: true });
}
