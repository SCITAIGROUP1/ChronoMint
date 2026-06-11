export const ROUTES = {
  HEALTH: "/health",
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    SWITCH_WORKSPACE: "/auth/switch-workspace",
    IMPERSONATE: "/auth/impersonate",
    STOP_IMPERSONATION: "/auth/stop-impersonation"
  },
  USERS: {
    ME: "/users/me",
    PREFERENCES: "/users/me/preferences",
    DASHBOARD_LAYOUT: "/users/me/dashboard-layout",
    PASSWORD: "/users/me/password",
    SESSIONS: "/users/me/sessions",
    SESSION: (id: string) => `/users/me/sessions/${id}`,
    TWO_FA_ENABLE: "/users/me/2fa/enable",
    TWO_FA_VERIFY: "/users/me/2fa/verify",
    TWO_FA_DISABLE: "/users/me/2fa/disable",
    ACTIVITY: "/users/me/activity"
  },
  WORKSPACES: {
    LIST: "/workspaces",
    CREATE: "/workspaces",
    BY_ID: (id: string) => `/workspaces/${id}`,
    MEMBERS: (id: string) => `/workspaces/${id}/members`,
    MEMBERS_OVERVIEW: (id: string) => `/workspaces/${id}/members/overview`,
    MEMBER: (workspaceId: string, memberId: string) =>
      `/workspaces/${workspaceId}/members/${memberId}`,
    INVITE: (id: string) => `/workspaces/${id}/members/invite`
  },
  PROJECTS: {
    LIST: "/projects",
    CREATE: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    TEAM: (id: string) => `/projects/${id}/team`,
    TEAM_MEMBER: (projectId: string, memberId: string) =>
      `/projects/${projectId}/team/members/${memberId}`,
    TEAM_INVITES: (id: string) => `/projects/${id}/team/invites`,
    /** @deprecated Use TEAM */
    MEMBERS: (id: string) => `/projects/${id}/team`,
    /** @deprecated Use TEAM_INVITES */
    INVITES: (id: string) => `/projects/${id}/team/invites`
  },
  TEAM_INVITES: {
    PREVIEW: (token: string) => `/team-invites/${token}`,
    ACCEPT: (token: string) => `/team-invites/${token}/accept`
  },
  /** @deprecated Use TEAM_INVITES */
  PROJECT_INVITES: {
    PREVIEW: (token: string) => `/team-invites/${token}`,
    ACCEPT: (token: string) => `/team-invites/${token}/accept`
  },
  TASKS: {
    LIST: "/tasks",
    CREATE: "/tasks",
    BY_ID: (id: string) => `/tasks/${id}`
  },
  CATEGORIES: {
    LIST: "/categories",
    CREATE: "/categories",
    BY_ID: (id: string) => `/categories/${id}`
  },
  TIMELOGS: {
    LIST: "/timelogs",
    OCCUPANCY: "/timelogs/occupancy",
    CREATE: "/timelogs",
    BY_ID: (id: string) => `/timelogs/${id}`,
    AUDIT_EVENTS: (id: string) => `/timelogs/${id}/audit-events`,
    YESTERDAY_SUMMARY: "/timelogs/yesterday-summary"
  },
  TIMER: {
    START: "/timer/start",
    STOP: "/timer/stop",
    ACTIVE: "/timer/active",
    ACTIVE_COUNT: "/timer/active-count",
    PAUSE: "/timer/pause",
    RESUME: "/timer/resume",
    DISCARD: "/timer/discard"
  },
  BILLING: {
    RATES: "/billing/rates",
    SUMMARY: "/billing/summary"
  },
  REPORTING: {
    DASHBOARD: "/reporting/dashboard",
    ME: "/reporting/me",
    BUDGET: (id: string) => `/reporting/projects/${id}/budget`,
    UTILIZATION: "/reporting/utilization",
    HEATMAP: "/reporting/heatmap",
    CATEGORIES_HEATMAP: "/reporting/categories-heatmap",
    TASKS: "/reporting/tasks"
  },
  PRESENCE: {
    STREAM: "/presence/stream",
    SNAPSHOT: "/presence/snapshot"
  },
  EXPORT: {
    GENERATE: "/export",
    PREVIEW: "/export/preview",
    ME: "/export/me",
    PRESETS: "/export/presets",
    PRESET: (id: string) => `/export/presets/${id}`,
    SCHEDULES: "/export/schedules",
    SCHEDULE: (id: string) => `/export/schedules/${id}`,
    SHARE: (token: string) => `/export/share/${token}`,
    SHARES: "/export/shares",
    INVOICE: "/export/invoice"
  },
  TIMESHEETS: {
    MY_STATUS: "/timesheets/status",
    MY_SUBMISSIONS: "/timesheets/submissions",
    SUBMIT: "/timesheets/submit",
    LIST_PENDING: "/timesheets/pending",
    APPROVE: (id: string) => `/timesheets/${id}/approve`,
    REJECT: (id: string) => `/timesheets/${id}/reject`
  },
  JIRA: {
    AUTH_STATUS: "/jira/auth/status",
    AUTH_CONNECT: "/jira/auth/connect",
    AUTH_CALLBACK: "/jira/auth/callback",
    AUTH_DISCONNECT: "/jira/auth/disconnect",
    PROJECTS: "/jira/projects",
    PROJECT_MAPPINGS: "/jira/projects/mappings",
    PROJECT_MAPPING: (id: string) => `/jira/projects/mappings/${id}`,
    PROJECTS_SYNC: "/jira/projects/sync",
    ISSUES: "/jira/issues",
    MY_ISSUES: "/jira/issues/my",
    ISSUES_SYNC: "/jira/issues/sync",
    USERS: "/jira/users",
    USER_MAPPINGS: "/jira/users/mappings",
    USERS_AUTO_MAP: "/jira/users/auto-map",
    WORKLOGS: "/jira/worklogs",
    WORKLOGS_SYNC: "/jira/worklogs/sync",
    SPRINTS: "/jira/sprints",
    LOGS: "/jira/logs"
  }
} as const;
