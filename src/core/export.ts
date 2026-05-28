const PREFIX = "cc98-live-better:";
const EXPORT_KEYS = [
  `${PREFIX}masterSalt`,
  `${PREFIX}accounts`,
  `${PREFIX}memes`,
  `${PREFIX}history`,
  `${PREFIX}features`,
] as const;

interface ExportData {
  version: 1;
  exportedAt: number;
  data: Record<string, unknown>;
}

export async function exportAll(): Promise<boolean> {
  const all = await chrome.storage.local.get(null);
  const data: Record<string, unknown> = {};
  for (const key of EXPORT_KEYS) {
    if (key in all) data[key] = all[key];
  }

  if (Object.keys(data).length === 0) return false;

  const exportObj: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    data,
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cc98-live-better-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export async function importAll(file: File): Promise<string> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return "无法读取文件";
  }

  let parsed: ExportData;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "文件格式无效，不是合法的 JSON";
  }

  if (parsed.version !== 1) {
    return "不支持的导出版本";
  }

  if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
    return "数据格式无效";
  }

  const hasAny = EXPORT_KEYS.some((k) => k in parsed.data);
  if (!hasAny) {
    return "文件中不包含有效数据";
  }

  await chrome.storage.local.set(parsed.data);
  return "";
}
