import { authScopeSchema, type AuthScope } from "@kloqra/contracts";

export function configuredAuthScope(value: string | undefined, defaultScope: AuthScope): AuthScope {
  const raw = value?.trim();
  if (!raw) return defaultScope;
  const parsed = authScopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Unsupported auth scope: ${raw}`);
  }
  return parsed.data;
}
