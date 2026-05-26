import type { FeatureSettings } from "../../types";

// 必须与 @wxt-dev/storage 内部使用的实际 key 一致
// storage.getItem("local:xx:yy") 实际读写 chrome.storage.local 的 "xx:yy" 键
const KEYS = {
  FEATURES: "cc98-live-better:features",
};

async function loadSettings(): Promise<FeatureSettings> {
  const result = await chrome.storage.local.get(KEYS.FEATURES);
  return result[KEYS.FEATURES] ?? { accountSwitcher: true, memeGallery: true, historySearch: true };
}

async function saveSettings(s: FeatureSettings): Promise<void> {
  await chrome.storage.local.set({ [KEYS.FEATURES]: s });
}

async function main() {
  const settings = await loadSettings();

  const accountToggle = document.getElementById("toggle-account") as HTMLInputElement;
  const memeToggle = document.getElementById("toggle-meme") as HTMLInputElement;
  const historyToggle = document.getElementById("toggle-history") as HTMLInputElement;

  accountToggle.checked = settings.accountSwitcher;
  memeToggle.checked = settings.memeGallery;
  historyToggle.checked = settings.historySearch;

  accountToggle.addEventListener("change", () => {
    settings.accountSwitcher = accountToggle.checked;
    saveSettings(settings);
  });
  memeToggle.addEventListener("change", () => {
    settings.memeGallery = memeToggle.checked;
    saveSettings(settings);
  });
  historyToggle.addEventListener("change", () => {
    settings.historySearch = historyToggle.checked;
    saveSettings(settings);
  });
}

main();
