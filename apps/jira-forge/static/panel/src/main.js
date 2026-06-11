import { invoke, view } from "@forge/bridge";

const app = document.getElementById("app");
let issueKey = null;
let taskId = null;
let taskName = null;
let pollId = null;

function formatElapsed(sec) {
  const total = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function render(html) {
  app.innerHTML = html;
}

function renderSetup() {
  render(`
    <h1>Connect ChronoMint</h1>
    <p class="muted">Create a personal access token in ChronoMint → Settings → Integrations.</p>
    <label for="apiBaseUrl">API base URL</label>
    <input id="apiBaseUrl" placeholder="https://api.example.com" />
    <label for="workspaceId">Workspace ID</label>
    <input id="workspaceId" placeholder="uuid" />
    <label for="pat">Personal access token</label>
    <input id="pat" type="password" placeholder="klo_pat_…" />
    <button id="saveBtn">Save connection</button>
    <p id="error" class="error"></p>
  `);

  document.getElementById("saveBtn").addEventListener("click", async () => {
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";
    try {
      await invoke("saveConfig", {
        apiBaseUrl: document.getElementById("apiBaseUrl").value,
        workspaceId: document.getElementById("workspaceId").value,
        pat: document.getElementById("pat").value
      });
      await bootstrap();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Could not save";
    }
  });
}

async function refreshTimerUi() {
  const active = await invoke("getActiveTimer");
  const tracking = Boolean(active?.taskId);
  const elapsed = active?.elapsedSec ?? 0;
  const trackingThisIssue = tracking && active.taskId === taskId;

  render(`
    <h1>ChronoMint</h1>
    <p class="muted">Issue <strong>${issueKey}</strong></p>
    <p class="task">${taskName ?? "Linked task"}</p>
    ${trackingThisIssue ? `<p class="elapsed">${formatElapsed(elapsed)}</p>` : ""}
    <div>
      ${
        trackingThisIssue
          ? `<button id="stopBtn">Stop timer</button>`
          : `<button id="startBtn" ${tracking ? "disabled" : ""}>Start timer</button>`
      }
      <button id="settingsBtn" class="secondary">Settings</button>
    </div>
    <p id="error" class="error"></p>
    ${tracking && !trackingThisIssue ? `<p class="muted">Another timer is running in this workspace.</p>` : ""}
  `);

  document.getElementById("settingsBtn")?.addEventListener("click", () => renderSetup());
  document.getElementById("startBtn")?.addEventListener("click", async () => {
    try {
      await invoke("startTimer", { taskId });
      await refreshTimerUi();
    } catch (err) {
      document.getElementById("error").textContent =
        err instanceof Error ? err.message : "Could not start";
    }
  });
  document.getElementById("stopBtn")?.addEventListener("click", async () => {
    try {
      await invoke("stopTimer", {});
      await refreshTimerUi();
    } catch (err) {
      document.getElementById("error").textContent =
        err instanceof Error ? err.message : "Could not stop";
    }
  });
}

async function bootstrap() {
  const config = await invoke("getConfig");
  if (!config.configured) {
    renderSetup();
    return;
  }

  const ctx = await view.getContext();
  issueKey = ctx?.extension?.issue?.key;
  if (!issueKey) {
    render(`<p class="error">Open this panel from a Jira issue.</p>`);
    return;
  }

  try {
    const resolved = await invoke("resolveIssue", { issueKey });
    taskId = resolved.taskId;
    taskName = resolved.taskName;
    await refreshTimerUi();
    if (pollId) clearInterval(pollId);
    pollId = setInterval(() => {
      void refreshTimerUi().catch(() => {});
    }, 5000);
  } catch (err) {
    render(
      `<p class="error">${err instanceof Error ? err.message : "Could not resolve issue"}</p><button id="settingsBtn">Settings</button>`
    );
    document.getElementById("settingsBtn")?.addEventListener("click", () => renderSetup());
  }
}

void bootstrap();
