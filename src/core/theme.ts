/**
 * 主题色适配工具
 *
 * 等待 CC98 的 React 渲染出顶栏后，读取其 background-color，
 * 推算一组主题色 CSS 变量注入到 :root。使插件弹窗跟随 CC98 当前主题。
 */

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryBg: string;
  textOnPrimary: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function parseRGBA(color: string): { r: number; g: number; b: number } | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}

function lighten(r: number, g: number, b: number, factor: number): string {
  return rgbToHex(
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  );
}

/** 从已存在的顶栏元素中提取主题色 */
function extractFromBar(bar: HTMLElement): ThemeColors | null {
  const cssColor = getComputedStyle(bar).backgroundColor;
  const parsed = parseRGBA(cssColor);
  if (!parsed) return null;
  const { r, g, b } = parsed;
  return {
    primary: rgbToHex(r, g, b),
    primaryLight: lighten(r, g, b, 0.35),
    primaryBg: lighten(r, g, b, 0.82),
    textOnPrimary: "#ffffff",
  };
}

const FALLBACK: ThemeColors = {
  primary: "#394676",
  primaryLight: "#5a6b9e",
  primaryBg: "#eef0f7",
  textOnPrimary: "#ffffff",
};

/** 将主题色写入 :root CSS 变量 */
function applyTheme(colors: ThemeColors): void {
  const style = document.createElement("style");
  style.id = "cc98-theme-vars";
  style.textContent = `
    :root {
      --cc98-primary: ${colors.primary};
      --cc98-primary-light: ${colors.primaryLight};
      --cc98-primary-bg: ${colors.primaryBg};
      --cc98-text-on-primary: ${colors.textOnPrimary};
    }
  `;
  document.getElementById("cc98-theme-vars")?.remove();
  document.head.appendChild(style);
}

/**
 * 等待 .topBar 或 .topBar-mainPage 出现后提取主题色并注入 CSS 变量
 */
export function injectThemeCSS(): void {
  // 先把 fallback 注入，让 UI 立即有颜色
  applyTheme(FALLBACK);

  // 用 MutationObserver 等待 React 渲染顶栏
  const observer = new MutationObserver(() => {
    const bar =
      document.querySelector<HTMLElement>(".topBar") ??
      document.querySelector<HTMLElement>(".topBar-mainPage");
    if (!bar) return;

    const colors = extractFromBar(bar);
    if (colors) {
      console.log("[CC98 Live Better] theme detected:", colors.primary);
      applyTheme(colors);
    }
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 如果 10s 后顶栏仍未出现，放弃观察（仍保留 fallback）
  setTimeout(() => observer.disconnect(), 10000);
}
