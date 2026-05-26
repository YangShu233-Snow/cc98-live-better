/**
 * 显示短暂的通知消息（2s 后自动消失）
 * 用于各功能模块向用户反馈操作结果
 */
export function showToast(msg: string): void {
  const existing = document.querySelector(".cc98-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "cc98-toast";
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    z-index: 100000; background: #333; color: #fff;
    padding: 10px 20px; border-radius: 6px; font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * 等待指定 DOM 元素出现（用于 CC98 SPA 动态渲染的场景）
 * @param selector CSS 选择器
 * @param timeout 超时毫秒数，默认 10s
 * @returns 匹配的元素，超时返回 null
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  timeout = 10000
): Promise<T | null> {
  const existing = document.querySelector<T>(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      observer.disconnect();
      resolve(null);
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el && !timedOut) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * 向页面注入全局 CSS 样式
 * @param css 样式文本
 * @returns 创建的 <style> 元素
 */
export function injectCSS(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/**
 * 创建 DOM 元素的便捷方法，支持 className / style 快捷设置
 * @param tag 标签名
 * @param attrs 属性键值对（支持 className 和 style 特殊属性）
 * @param children 子元素（字符串自动转为 TextNode）
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      el.className = value;
    } else if (key === "style") {
      el.style.cssText = value;
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}
