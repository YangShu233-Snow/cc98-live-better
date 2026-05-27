export interface EmojiItem {
  url: string;
  ubb: string;
}

export interface EmojiGroup {
  id: string;
  name: string;
  items: EmojiItem[];
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

// ── CC98 ──────────────────────────────────────────
function buildCC98(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 1; i <= 37; i++) {
    const id = pad(i, 2);
    const ext = (i > 14 && i < 31) || i > 35 ? "png" : "gif";
    items.push({
      url: `/static/images/CC98/CC98${id}.${ext}`,
      ubb: `[CC98${id}]`,
    });
  }
  return items;
}

// ── 麻将脸-动物 ─────────────────────────────────
function buildAnimal(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 1; i <= 16; i++) {
    const id = pad(i, 3);
    items.push({
      url: `/static/images/mahjong/animal2017/${id}.png`,
      ubb: `[a:${id}]`,
    });
  }
  return items;
}

// ── 麻将脸-卡通 ─────────────────────────────────
const CARTON_MAP: [string, string][] = [
  ["003", "png"],
  ["018", "gif"],
  ["019", "png"],
  ["046", "png"],
  ["049", "gif"],
  ["059", "png"],
  ["096", "gif"],
  ["134", "png"],
  ["189", "png"],
  ["217", "png"],
];

function buildCarton(): EmojiItem[] {
  return CARTON_MAP.map(([id, ext]) => ({
    url: `/static/images/mahjong/carton2017/${id}.${ext}`,
    ubb: `[c:${id}]`,
  }));
}

// ── 麻将脸-经典脸部 ─────────────────────────────
const FACE_GIF_INDICES = new Set([
  4, 9, 56, 61, 62, 87, 115, 120, 137, 168, 169, 175, 206,
]);

function buildFace(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 1; i <= 208; i++) {
    const id = pad(i, 3);
    const ext = FACE_GIF_INDICES.has(i) ? "gif" : "png";
    items.push({
      url: `/static/images/mahjong/face2017/${id}.${ext}`,
      ubb: `[f:${id}]`,
    });
  }
  return items;
}

// ── 经典论坛表情 ─────────────────────────────────
function buildEm(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 0; i <= 43; i++) {
    const id = pad(i, 2);
    items.push({ url: `/static/images/em/em${id}.gif`, ubb: `[em${id}]` });
  }
  for (let i = 71; i <= 91; i++) {
    const id = String(i);
    items.push({ url: `/static/images/em/em${id}.gif`, ubb: `[em${id}]` });
  }
  return items;
}

// ── AcFun ─────────────────────────────────────────
function buildAc(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 0; i <= 148; i++) {
    let id: string;
    if (i <= 8) {
      id = pad(i + 1, 2);
    } else if (i <= 53) {
      id = String(i + 1);
    } else if (i <= 93) {
      id = String(i + 947);
    } else {
      id = String(i + 1907);
    }
    items.push({ url: `/static/images/ac/${id}.png`, ubb: `[ac${id}]` });
  }
  return items;
}

// ── 贴吧 ─────────────────────────────────────────
function buildTb(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 1; i <= 33; i++) {
    const id = pad(i, 2);
    items.push({ url: `/static/images/tb/tb${id}.png`, ubb: `[tb${id}]` });
  }
  return items;
}

// ── 雀魂 ─────────────────────────────────────────
function buildMs(): EmojiItem[] {
  const items: EmojiItem[] = [];
  for (let i = 1; i <= 54; i++) {
    const id = pad(i, 2);
    items.push({ url: `/static/images/ms/ms${id}.png`, ubb: `[ms${id}]` });
  }
  return items;
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  { id: "cc98", name: "CC98", items: buildCC98() },
  { id: "ac", name: "AC娘", items: buildAc() },
  { id: "mahjong", name: "麻将脸", items: [...buildAnimal(), ...buildCarton(), ...buildFace()] },
  { id: "tb", name: "贴吧", items: buildTb() },
  { id: "ms", name: "雀魂", items: buildMs() },
  { id: "em", name: "经典", items: buildEm() },
];

export const EMOJI_BASE_PATH = "/static/images/";
