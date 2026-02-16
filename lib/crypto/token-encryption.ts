import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '@/lib/env';

const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");

if (KEY.length !== 32) {
  throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
}

export function encryptAccessToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptAccessToken(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const ivBase64 = parts[0];
  const authTagBase64 = parts[1];
  const dataBase64 = parts[2];
  
  if (!ivBase64 || !authTagBase64 || !dataBase64) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(dataBase64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
