import api, { storage } from "@forge/api";
import Resolver from "@forge/resolver";
import { chronomintFetch } from "../lib/chronomint-client.js";

const resolver = new Resolver();

async function loadConfig() {
  const settings = (await storage.get("chronomint-config")) ?? {};
  const pat = await storage.getSecret("chronomint-pat");
  return {
    apiBaseUrl: settings.apiBaseUrl ?? "",
    workspaceId: settings.workspaceId ?? "",
    pat: pat ?? ""
  };
}

resolver.define("getConfig", async () => {
  const config = await loadConfig();
  return {
    configured: Boolean(config.apiBaseUrl && config.workspaceId && config.pat),
    apiBaseUrl: config.apiBaseUrl,
    workspaceId: config.workspaceId
  };
});

resolver.define("saveConfig", async ({ payload }) => {
  await storage.set("chronomint-config", {
    apiBaseUrl: String(payload.apiBaseUrl ?? "").trim(),
    workspaceId: String(payload.workspaceId ?? "").trim()
  });
  await storage.setSecret("chronomint-pat", String(payload.pat ?? "").trim());
  return { ok: true };
});

resolver.define("resolveIssue", async ({ payload }) => {
  const config = await loadConfig();
  const params = new URLSearchParams({ issueKey: String(payload.issueKey) });
  return chronomintFetch(api, config, `/integrations/jira/resolve?${params}`);
});

resolver.define("startTimer", async ({ payload }) => {
  const config = await loadConfig();
  return chronomintFetch(api, config, "/timer/start", {
    method: "POST",
    body: { taskId: payload.taskId }
  });
});

resolver.define("stopTimer", async ({ payload }) => {
  const config = await loadConfig();
  return chronomintFetch(api, config, "/timer/stop", {
    method: "POST",
    body: payload ?? {}
  });
});

resolver.define("getActiveTimer", async () => {
  const config = await loadConfig();
  return chronomintFetch(api, config, "/timer/active");
});

export const handler = resolver.getDefinitions();
