/**
 * @param {import('@forge/api').default} api
 * @param {{ apiBaseUrl: string; workspaceId: string; pat: string }} config
 * @param {string} path
 * @param {{ method?: string; body?: unknown }} [options]
 */
export async function chronomintFetch(api, config, path, options = {}) {
  if (!config?.apiBaseUrl?.trim() || !config?.workspaceId?.trim() || !config?.pat?.trim()) {
    throw new Error("ChronoMint is not configured");
  }

  const url = `${config.apiBaseUrl.replace(/\/$/, "")}${path}`;
  const response = await api.fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.pat}`,
      "X-Workspace-Id": config.workspaceId,
      "X-Auth-Scope": "client",
      "Content-Type": "application/json"
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : `ChronoMint request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}
