import type { FeatureSettings } from "../../types";
import { exportAll, importAll } from "../../core/export";

const KEYS = {
  FEATURES: "cc98-live-better:features",
};

function status(msg: string, type?: "ok" | "err") {
  const el = document.getElementById("status-msg")!;
  el.textContent = msg;
  el.className = "status" + (type ? ` ${type}` : "");
}

async function loadSettings(): Promise<FeatureSettings> {
  const result = await chrome.storage.local.get(KEYS.FEATURES);
  return result[KEYS.FEATURES] ?? { accountSwitcher: false, memeGallery: true, pmEmojiPanel: true, historySearch: true };
}

async function saveSettings(s: FeatureSettings): Promise<void> {
  await chrome.storage.local.set({ [KEYS.FEATURES]: s });
}

async function main() {
  const settings = await loadSettings();

  const accountToggle = document.getElementById("toggle-account") as HTMLInputElement;
  const memeToggle = document.getElementById("toggle-meme") as HTMLInputElement;
  const pmEmojiToggle = document.getElementById("toggle-pm-emoji") as HTMLInputElement;
  const historyToggle = document.getElementById("toggle-history") as HTMLInputElement;

  accountToggle.checked = settings.accountSwitcher;
  memeToggle.checked = settings.memeGallery;
  pmEmojiToggle.checked = settings.pmEmojiPanel;
  historyToggle.checked = settings.historySearch;

  accountToggle.addEventListener("change", () => {
    settings.accountSwitcher = accountToggle.checked;
    saveSettings(settings);
  });
  memeToggle.addEventListener("change", () => {
    settings.memeGallery = memeToggle.checked;
    saveSettings(settings);
  });
  pmEmojiToggle.addEventListener("change", () => {
    settings.pmEmojiPanel = pmEmojiToggle.checked;
    saveSettings(settings);
  });
  historyToggle.addEventListener("change", () => {
    settings.historySearch = historyToggle.checked;
    saveSettings(settings);
  });

  document.getElementById("btn-export")!.addEventListener("click", async () => {
    const ok = await exportAll();
    status(ok ? "数据已导出" : "没有数据可导出", ok ? "ok" : "err");
  });

  document.getElementById("btn-import")!.addEventListener("click", () => {
    document.getElementById("file-picker")!.click();
  });

  document.getElementById("file-picker")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!confirm("导入将覆盖所有现有数据，确认继续？")) {
      (e.target as HTMLInputElement).value = "";
      return;
    }

    const err = await importAll(file);
    (e.target as HTMLInputElement).value = "";

    if (err) {
      status(err, "err");
      return;
    }

    status("数据已导入", "ok");

    const s = await loadSettings();
    accountToggle.checked = s.accountSwitcher;
    memeToggle.checked = s.memeGallery;
    pmEmojiToggle.checked = s.pmEmojiPanel;
    historyToggle.checked = s.historySearch;
  });
}

main();
