type Header = { key: string; value: string };

type SecurityHeaderOptions = {
  nodeEnv?: string;
  apiBaseUrl?: string;
};

function apiOrigins(apiBaseUrl: string | undefined): string[] {
  if (!apiBaseUrl) return [];

  try {
    const url = new URL(apiBaseUrl);
    const socketProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${socketProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

function contentSecurityPolicy(options: SecurityHeaderOptions, embeddable: boolean): string {
  const production = options.nodeEnv === "production";
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${apiOrigins(options.apiBaseUrl).join(" ")}`.trim(),
    "font-src 'self' data:",
    "form-action 'self'",
    `frame-ancestors ${embeddable ? "*" : "'none'"}`,
    "frame-src 'none'",
    "img-src 'self' data: blob: https:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:"
  ];

  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function commonHeaders(options: SecurityHeaderOptions): Header[] {
  const headers: Header[] = [
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" }
  ];

  if (options.nodeEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload"
    });
  }

  return headers;
}

export function buildSecurityHeaders(options: SecurityHeaderOptions = {}) {
  return [
    {
      source: "/((?!widget(?:/|$)).*)",
      headers: [
        ...commonHeaders(options),
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy(options, false)
        }
      ]
    },
    {
      source: "/widget/:path*",
      headers: [
        ...commonHeaders(options),
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy(options, true)
        }
      ]
    }
  ];
}
