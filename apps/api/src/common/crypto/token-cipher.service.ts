import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

@Injectable()
export class TokenCipherService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
    const source =
      raw && raw.length >= 32
        ? raw
        : (process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-min-32-chars-long");
    this.key = createHash("sha256").update(source).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64url");
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, "base64url");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}
