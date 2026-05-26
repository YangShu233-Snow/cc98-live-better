/**
 * 表情包数据存储层
 * 提供表情条目的增删查操作
 */
import type { MemeItem } from "../../types";
import { Storage } from "../../core/storage";

export interface AddMemeInput {
  /** 图片 URL */
  url: string;
  /** 可选的自定义名称 */
  name?: string;
}

export interface AddMemeResult {
  item: MemeItem;
  /** added: 新增成功, duplicate: 已存在跳过, error: 存储失败 */
  status: "added" | "duplicate" | "error";
  error?: string;
}

/** 添加一个表情 */
export async function addMeme(input: AddMemeInput): Promise<AddMemeResult> {
  try {
    const memes = (await Storage.getMemes()) ?? [];
    const existing = memes.find((m) => m.url === input.url);
    if (existing) {
      return { item: existing, status: "duplicate" };
    }

    const id = crypto.randomUUID();
    const item: MemeItem = {
      id,
      url: input.url,
      name: input.name ?? `表情 ${memes.length + 1}`,
      addedAt: Date.now(),
    };

    memes.push(item);
    await Storage.setMemes(memes);
    return { item, status: "added" };
  } catch (e) {
    return {
      item: { id: "", url: input.url, name: "", addedAt: 0 },
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** 删除指定表情 */
export async function removeMeme(id: string): Promise<void> {
  const memes = (await Storage.getMemes()) ?? [];
  await Storage.setMemes(memes.filter((m) => m.id !== id));
}

/** 获取所有收藏的表情 */
export async function getAllMemes(): Promise<MemeItem[]> {
  return (await Storage.getMemes()) ?? [];
}
