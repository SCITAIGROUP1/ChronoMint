import { authScopeSchema, type AuthScope, type ProductAuthScope } from "@kloqra/contracts";
import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

export type { AuthScope, ProductAuthScope };

export function isProductAuthScope(scope: AuthScope): scope is ProductAuthScope {
  return scope === "app";
}

export function getAuthScope(req: Request): AuthScope {
  const raw = req.headers["x-auth-scope"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (!value) return "app";
  const parsed = authScopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new UnauthorizedException("Invalid auth scope");
  }
  return parsed.data;
}

export function accessCookieName(scope: AuthScope): string {
  return scope === "app" ? "access_token" : `access_token_${scope}`;
}

export function refreshCookieName(scope: AuthScope): string {
  return scope === "app" ? "refresh_token" : `refresh_token_${scope}`;
}
