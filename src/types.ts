/** 已保存的账号数据，加密后持久化存储 */
export interface AccountData {
  /** CC98 用户 ID */
  userId: number;
  /** 用户自定义显示名称 */
  label: string;
  /** 加密后的 token 载荷 */
  encryptedData: EncryptedPayload;
  /** 保存时间戳 */
  createdAt: number;
}

/** AES-GCM 加密后的载荷结构 */
export interface EncryptedPayload {
  /** PBKDF2 盐值（Base64） */
  salt: string;
  /** AES-GCM 初始化向量（Base64） */
  iv: string;
  /** 密文（Base64） */
  ciphertext: string;
}

/** CC98 登录后 localStorage 中的 token 数据 */
export interface AccountToken {
  /** OIDC refresh_token（30 天有效） */
  refreshToken: string;
  /** refresh_token 过期时间戳 */
  refreshTokenExpirationTime: number;
  /** userInfo 的原始 JSON 字符串（含 str- 前缀） */
  userInfo: string;
  /** 短期 access_token（注入后 CC98 在首个 API 401 时自动用 refresh_token 续期） */
  accessToken?: string;
}

/** 收藏的表情包条目 */
export interface MemeItem {
  /** 唯一标识 */
  id: string;
  /** 图片 URL */
  url: string;
  /** 用户自定义名称 */
  name: string;
  /** 收藏时间 */
  addedAt: number;
}

/** 浏览历史记录 */
export interface HistoryItem {
  /** 帖子标题 */
  title: string;
  /** 楼主用户名 */
  author: string;
  /** 帖子路径，如 /topic/12345 */
  url: string;
  /** 访问时间戳 */
  timestamp: number;
  /** 版面名称 */
  board?: string;
}

/** 各功能的启用/禁用开关 */
export interface FeatureSettings {
  accountSwitcher: boolean;
  memeGallery: boolean;
  historySearch: boolean;
}

/** 插件全局设置 */
export interface AppSettings {
  /** 主密码盐值 */
  masterSalt?: string;
}
