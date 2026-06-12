import { authenticator } from "otplib";

const ISSUER = "Kloqra";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function generateTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verifyTotpCode(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

/** Test helper — generate a valid TOTP for the current time window. */
export function generateTotpCode(secret: string): string {
  return authenticator.generate(secret);
}
