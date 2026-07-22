import { NotificationType } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  groupNotificationsByCategory,
  notificationInboxCategory
} from "./notification-inbox-groups";

describe("notificationInboxCategory", () => {
  it("classifies work notifications", () => {
    expect(notificationInboxCategory(NotificationType.PROJECT_ASSIGNMENT)).toBe("work");
    expect(notificationInboxCategory(NotificationType.APPROVAL_REQUEST)).toBe("work");
  });

  it("classifies time notifications", () => {
    expect(notificationInboxCategory(NotificationType.TIMESHEET_REMINDER)).toBe("time");
    expect(notificationInboxCategory(NotificationType.IDLE_TIMER_ALERT)).toBe("time");
  });

  it("classifies account notifications", () => {
    expect(notificationInboxCategory(NotificationType.EXPORT_SCHEDULE)).toBe("account");
    expect(notificationInboxCategory(NotificationType.JIRA_SYNC_UPDATE)).toBe("account");
  });
});

describe("groupNotificationsByCategory", () => {
  it("groups items under non-empty category headings", () => {
    const groups = groupNotificationsByCategory([
      {
        id: "1",
        type: NotificationType.PROJECT_ASSIGNMENT,
        title: "Assigned",
        body: "Body",
        readAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        type: NotificationType.TIMESHEET_REMINDER,
        title: "Reminder",
        body: "Body",
        readAt: null,
        createdAt: new Date().toISOString()
      }
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Work", "Time"]);
  });
});
