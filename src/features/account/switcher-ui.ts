/**
 * 账号切换 UI 注入模块
 *
 * 在 CC98 顶栏的用户中心下拉菜单中注入"切换账号"入口：
 * - 利用 CC98 原有的 hover 展开/收起机制
 * - 在退出登录同级位置插入新选项
 * - hover 该选项后右侧展开子菜单显示已保存账号列表
 */
import { waitForElement, showToast } from "../../core/dom";
import { CC98 } from "../../core/cc98";
import { Storage } from "../../core/storage";
import { loginWithAccount, saveCurrentAccount, getCurrentUserId, removeAccount } from "./token-capture";

/** 当前处于活跃状态的账号 ID，用于高亮标记 */
let activeAccountId: number | null = getCurrentUserId();

/** 根据当前页面路径选择正确的下拉菜单容器选择器 */
function getDropdownSelector(): string {
  return location.pathname === "/"
    ? CC98.SELECTORS.USER_CENTER_DROPDOWN_MAIN
    : CC98.SELECTORS.USER_CENTER_DROPDOWN;
}

/**
 * 显示弹窗背景遮罩（内部复用）
 */
function createOverlay(): { overlay: HTMLDivElement; box: HTMLDivElement; close: (value: null) => void } {
  const overlay = document.createElement("div");
  overlay.className = "cc98-dialog-overlay";
  overlay.style.cssText = `position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.4);`;

  const box = document.createElement("div");
  box.className = "cc98-dialog-box";
  box.style.cssText = `background: #fff; border-radius: 8px; padding: 24px;
    min-width: 360px; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);`;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = (value: null) => {
    document.body.removeChild(overlay);
    return value;
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(null);
  });

  return { overlay, box, close };
}

/**
 * 显示密码输入弹窗
 * @param title 弹窗标题
 * @returns 用户输入的密码，取消返回 null
 */
async function showPasswordDialog(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    const { overlay, box, close } = createOverlay();

    const heading = document.createElement("h3");
    heading.style.cssText = "margin: 0 0 16px; font-size: 16px; color: #333;";
    heading.textContent = title;

    const form = document.createElement("form");
    form.autocomplete = "off";
    form.style.cssText = "margin:0;padding:0";
    form.addEventListener("submit", (e) => e.preventDefault());

    const hiddenUsername = document.createElement("input");
    hiddenUsername.type = "text";
    hiddenUsername.autocomplete = "username";
    hiddenUsername.tabIndex = -1;
    hiddenUsername.readOnly = true;
    hiddenUsername.setAttribute("aria-hidden", "true");
    hiddenUsername.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";

    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "new-password";
    input.placeholder = "请输入主密码";
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-bwignore", "true");
    input.style.cssText = `width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9;
      border-radius: 4px; font-size: 14px; box-sizing: border-box; outline: none;`;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `padding: 6px 16px; border: 1px solid #d9d9d9;
      border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;`;

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "确认";
    confirmBtn.style.cssText = `padding: 6px 16px; border: none; border-radius: 4px;
      background: var(--cc98-primary, #1677ff); color: #fff; cursor: pointer; font-size: 14px;`;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); document.body.removeChild(overlay); resolve(input.value); }
      if (e.key === "Escape") { document.body.removeChild(overlay); resolve(null); }
    });
    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
    confirmBtn.onclick = () => { document.body.removeChild(overlay); resolve(input.value); };

    btnRow.append(cancelBtn, confirmBtn);
    form.append(hiddenUsername, input, btnRow);
    box.append(heading, form);

    // requestAnimationFrame 确保 DOM 挂载完成后才聚焦，避免焦点泄漏到搜索框
    requestAnimationFrame(() => input.focus());
  });
}

/**
 * 显示账号选择弹窗（密码已验证）
 * 用户选择一个账号完成切换，底部提供"添加当前账号"选项
 */
async function showAccountPicker(accounts: import("../../types").AccountData[], password: string): Promise<number | null> {
  return new Promise((resolve) => {
    const { overlay, box, close } = createOverlay();

    const heading = document.createElement("h3");
    heading.style.cssText = "margin: 0 0 12px; font-size: 16px; color: #333;";
    heading.textContent = "选择要切换的账号";

    const list = document.createElement("div");
    list.style.cssText = "max-height: 240px; overflow-y: auto;";

    let selectedIdx = -1;
  const allRows: HTMLElement[] = [];

  for (const account of accounts) {
      const row = document.createElement("div");
      row.style.cssText = `padding: 8px 12px; cursor: pointer; font-size: 14px;
        border-radius: 4px; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #f5f5f5;`;
      if (account.userId === activeAccountId) {
        row.style.background = "var(--cc98-primary-bg, #f0f5ff)";
        row.style.fontWeight = "bold";
      }

      const label = document.createElement("span");
      label.textContent = account.label;

      row.append(label);
      row.addEventListener("click", async () => {
        document.body.removeChild(overlay);
        const ok = await loginWithAccount(account, password);
        if (ok) location.reload();
        else showToast("密码错误");
        resolve(account.userId);
      });
      list.appendChild(row);
      allRows.push(row);
    }

    // 添加当前账号选项
    const addRow = document.createElement("div");
    addRow.style.cssText = `padding: 8px 12px; cursor: pointer; font-size: 14px;
      border-radius: 4px; color: var(--cc98-primary, #1677ff); border-top: 1px solid #e8e8e8;
      margin-top: 4px; text-align: center;`;
    addRow.textContent = "+ 保存当前账号";
    addRow.addEventListener("click", async () => {
      document.body.removeChild(overlay);
      promptSaveAccount();
      resolve(null);
    });
    list.appendChild(addRow);
    allRows.push(addRow);

    // 键盘导航
    function highlightPickerRow(idx: number): void {
      allRows.forEach((r) => r.style.removeProperty("background"));
      if (idx >= 0 && idx < allRows.length) {
        allRows[idx].style.background = "var(--cc98-primary-bg, #eef0f7)";
        allRows[idx].scrollIntoView({ block: "nearest" });
      }
    }

    function confirmPickerRow(idx: number): void {
      if (idx < 0 || idx >= allRows.length) return;
      document.body.removeChild(overlay);
      if (idx < accounts.length) {
        loginWithAccount(accounts[idx], password).then((ok) => {
          if (ok) location.reload();
          else showToast("密码错误");
          resolve(accounts[idx].userId);
        });
      } else {
        promptSaveAccount();
        resolve(null);
      }
    }

    // capture 阶段拦截键盘事件，避免被 CC98 jQuery 或 React 抢先消费
    const pickerKeydown = (e: KeyboardEvent) => {
      if (!document.body.contains(overlay)) {
        document.removeEventListener("keydown", pickerKeydown, { capture: true });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.min(selectedIdx + 1, allRows.length - 1);
        highlightPickerRow(selectedIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        highlightPickerRow(selectedIdx);
      } else if (e.key === "Enter" && selectedIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        confirmPickerRow(selectedIdx);
      }
    };
    document.addEventListener("keydown", pickerKeydown, { capture: true });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `padding: 6px 16px; border: 1px solid #d9d9d9;
      border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;
      margin-top: 12px;`;

    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };

    box.append(heading, list, cancelBtn);

    // 自动高亮第一行，方便键盘导航
    if (allRows.length > 0) {
      selectedIdx = 0;
      highlightPickerRow(0);
    }
  });
}

/** 弹出保存当前账号的提示（用于首次检测到新账号时） */
async function promptSaveAccount(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  const accounts = (await Storage.getAccounts()) ?? [];
  if (accounts.some((a) => a.userId === userId)) return;

  const existingSalt = await Storage.getMasterSalt();
  let password: string | null;

  if (existingSalt) {
    password = await showPasswordDialog("保存此账号到切换列表？");
  } else {
    password = await showPasswordDialog("设置主密码以保存账号");
  }

  if (!password) return;

  const userInfo = JSON.parse(localStorage.getItem(CC98.STORAGE_KEYS.USER_INFO)?.slice(4) ?? "{}");
  const ok = await saveCurrentAccount(password);
  if (ok) {
    showToast(`账号 ${userInfo.name ?? ""} 已保存`);
    renderSwitcherMenu();
  } else {
    showToast("保存失败，请重试");
  }
}

/** 渲染/刷新账号切换菜单 */
async function renderSwitcherMenu(): Promise<void> {
  const container = await waitForElement(getDropdownSelector(), 5000);
  if (!container) return;

  const existing = container.querySelector(".cc98-account-entry");
  if (existing) existing.remove();

  const accounts = (await Storage.getAccounts()) ?? [];

  const entryLi = document.createElement("li");
  entryLi.className = "cc98-account-entry";
  entryLi.style.cssText = "cursor: pointer; white-space: nowrap;";

  const textSpan = document.createElement("span");
  textSpan.textContent = "切换账号";
  entryLi.appendChild(textSpan);

  // 显示账号数量小标签（仅在有账号时）
  if (accounts.length > 0) {
    const badge = document.createElement("span");
    badge.textContent = `(${accounts.length})`;
    badge.style.cssText = "color: #999; font-size: 11px; margin-left: 4px;";
    entryLi.appendChild(badge);
  }

  // 用 mousedown（早于 click）拦截事件，避免事件穿透到 CC98 的 jQuery 处理器
  entryLi.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    setTimeout(() => {
      if (accounts.length === 0) {
        promptSaveAccount();
        return;
      }

      showPasswordDialog("输入主密码切换账号").then((password) => {
        if (!password) return;
        showAccountPicker(accounts, password);
      });
    }, 0);
  });

  const ul = container.querySelector("ul");
  if (ul) {
    ul.appendChild(entryLi);
  }
}

/** 初始化账号切换 UI 并持续监听 DOM 变化 */
export async function initAccountSwitcher(): Promise<void> {
  await renderSwitcherMenu();

  // 监控页面主体变化，处理两种情况：
  // 1. 用户身份变化（跨标签页登录/登出）
  // 2. React 重新渲染导致我们注入的元素被移除
  const bodyObserver = new MutationObserver(() => {
    const currentId = getCurrentUserId();
    if (currentId !== activeAccountId) {
      activeAccountId = currentId;
      renderSwitcherMenu();
      return;
    }
    // 如果元素被 React re-render 移除，重新注入
    const container = document.querySelector(getDropdownSelector());
    if (container && !container.querySelector(".cc98-account-entry")) {
      renderSwitcherMenu();
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

export { promptSaveAccount, showPasswordDialog };
