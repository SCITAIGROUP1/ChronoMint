import { platformClientOrigin } from "./platform-origin.util";

export function appOrigin(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (!explicit) return "http://localhost:3000";
  const [first] = explicit
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return (first ?? "http://localhost:3000").replace(/\/$/, "");
}

export function originForNotificationHref(href: string): string {
  const platformPaths = ["/tenants", "/ops"];
  const isPlatform = platformPaths.some((p) => href === p || href.startsWith(`${p}/`));
  if (isPlatform) {
    return platformClientOrigin();
  }

  return appOrigin();
}
