/**
 * 账号数据加密模块
 *
 * 使用 PBKDF2 + AES-GCM 对 token 数据进行加密存储：
 * 1. 用户设置主密码时生成随机盐值持久化存储
 * 2. 加密时用密码+盐值派生 AES-256 密钥，用随机 IV 加密
 * 3. 解密时用同样的密码+盐值还原密钥解密
 * 盐值明文存储（防彩虹表），密码本身不存储
 */

/** Base64 → Uint8Array */
function base64ToArray(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Uint8Array → Base64 */
function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

/**
 * 用 PBKDF2 从密码派生 AES-GCM 密钥
 * 100000 次迭代在安全性与性能间取得平衡
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** 生成 128 位随机盐值 */
export async function generateSalt(): Promise<string> {
  return arrayToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * 加密明文数据
 * @param plaintext 要加密的 JSON 字符串
 * @param password 用户主密码
 * @param salt PBKDF2 盐值
 * @returns Base64 编码的 IV 和密文
 */
export async function encrypt(
  plaintext: string,
  password: string,
  salt: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, base64ToArray(salt));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    iv: arrayToBase64(iv),
    ciphertext: arrayToBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * 解密密文数据
 * @param iv Base64 编码的 IV
 * @param ciphertext Base64 编码的密文
 * @param password 用户主密码
 * @param salt PBKDF2 盐值
 * @returns 解密后的 JSON 字符串
 */
export async function decrypt(
  iv: string,
  ciphertext: string,
  password: string,
  salt: string
): Promise<string> {
  const key = await deriveKey(password, base64ToArray(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArray(iv) },
    key,
    base64ToArray(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}
