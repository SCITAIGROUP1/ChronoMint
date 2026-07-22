import type { NotificationDto, NotificationType } from "@kloqra/contracts";

export type NotificationInboxCategory = "work" | "time" | "account";

export const NOTIFICATION_INBOX_CATEGORY_LABELS: Record<NotificationInboxCategory, string> = {
  work: "Work",
  time: "Time",
  account: "Account"
};

export const NOTIFICATION_INBOX_CATEGORY_ORDER: readonly NotificationInboxCategory[] = [
  "work",
  "time",
  "account"
];

const WORK_TYPES = new Set<NotificationType>([
  "PROJECT_ASSIGNMENT",
  "PROJECT_UNASSIGNED",
  "PROJECT_DEACTIVATED",
  "TASK_ASSIGNMENT",
  "TASK_UNASSIGNED",
  "APPROVAL_REQUEST",
  "TIMESHEET_SUBMITTED",
  "TIMESHEET_AMENDMENT_REQUESTED",
  "MEMBER_CHANGE",
  "MEMBER_ROLE_CHANGED",
  "WORKSPACE_ADDED",
  "WORKSPACE_REMOVED",
  "WORKSPACE_CREATED",
  "BUDGET_ALERT"
]);

const TIME_TYPES = new Set<NotificationType>([
  "TIMESHEET_REMINDER",
  "TIMESHEET_STATUS",
  "TIMESHEET_APPROVED",
  "TIMESHEET_REJECTED",
  "TIMESHEET_AMENDMENT_APPROVED",
  "TIMESHEET_AMENDMENT_DENIED",
  "TIMESHEET_MISSING_DIGEST",
  "IDLE_TIMER_ALERT",
  "TIMER_AUTOSTOPPED"
]);

export function notificationInboxCategory(type: NotificationType): NotificationInboxCategory {
  if (WORK_TYPES.has(type)) return "work";
  if (TIME_TYPES.has(type)) return "time";
  return "account";
}

export function groupNotificationsByCategory(
  items: readonly NotificationDto[]
): { category: NotificationInboxCategory; label: string; items: NotificationDto[] }[] {
  return NOTIFICATION_INBOX_CATEGORY_ORDER.map((category) => {
    const grouped = items.filter((item) => notificationInboxCategory(item.type) === category);
    if (grouped.length === 0) return null;
    return {
      category,
      label: NOTIFICATION_INBOX_CATEGORY_LABELS[category],
      items: grouped
    };
  }).filter((group): group is NonNullable<typeof group> => group !== null);
}
