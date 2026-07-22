"use client";

import type { NotificationDto, NotificationType } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  Skeleton,
  TablePagination,
  cn
} from "@kloqra/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import {
  formatNotificationTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationUnreadCount,
  usePaginatedNotifications
} from "../../hooks/use-notifications";
import { activateNotification } from "./notification-actions";
import {
  groupNotificationsByCategory,
  notificationInboxCategory,
  NOTIFICATION_INBOX_CATEGORY_LABELS,
  type NotificationInboxCategory
} from "./notification-inbox-groups";
import {
  NotificationDetails,
  iconForNotificationType,
  notificationVariantClass
} from "./notification-ui";

type ReadFilter = "all" | "unread";
type CategoryFilter = "all" | NotificationInboxCategory;

function iconForType(type: NotificationType, title?: string | null) {
  return iconForNotificationType(type, title);
}

function NotificationRow({
  item,
  workspaceId,
  onUpdated
}: {
  item: NotificationDto;
  workspaceId: string;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const Icon = iconForType(item.type, item.title);
  const isUnread = !item.readAt;
  const href = item.metadata?.href;

  async function setRead(read: boolean) {
    await markNotificationRead(workspaceId, item.id, read);
    onUpdated();
  }

  async function handleActivate() {
    await activateNotification(workspaceId, item, href ? router.push.bind(router) : undefined);
    onUpdated();
  }

  async function handleRowActivate() {
    if (isUnread) {
      await setRead(true);
    } else if (href) {
      await handleActivate();
    }
  }

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-3 sm:gap-4 sm:px-4",
        "transition-[background-color,border-color,box-shadow] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
        isUnread && "border-primary/25 bg-primary/[0.03] shadow-sm",
        !isUnread && "opacity-95",
        "hover:border-border hover:bg-muted/20",
        notificationVariantClass(item.metadata)
      )}
      role="button"
      tabIndex={0}
      onClick={() => void handleRowActivate()}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void handleRowActivate();
        }
      }}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10",
          isUnread ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
              {isUnread ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  New
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
            <NotificationDetails details={item.metadata?.details} />
          </div>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatNotificationTimeAgo(item.createdAt)}
          </time>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {href ? (
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void handleActivate();
              }}
            >
              {item.metadata?.ctaLabel ?? "Open"}
            </Button>
          ) : null}
          {isUnread ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                void setRead(true);
              }}
            >
              Mark read
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                void setRead(false);
              }}
            >
              Mark unread
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function NotificationsPage({ workspaceId }: { workspaceId: string }) {
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const { count, refresh: refreshUnread, aligned } = useNotificationUnreadCount(workspaceId);
  const { items, page, setPage, total, totalPages, limit, setLimit, loading, reload } =
    usePaginatedNotifications(workspaceId, { unreadOnly: readFilter === "unread" });

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((item) => notificationInboxCategory(item.type) === categoryFilter);
  }, [categoryFilter, items]);

  const groupedItems = useMemo(() => groupNotificationsByCategory(filteredItems), [filteredItems]);

  const readFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "unread" as const, label: `Unread${count > 0 ? ` (${count})` : ""}` }
    ],
    [count]
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All topics" },
      ...Object.entries(NOTIFICATION_INBOX_CATEGORY_LABELS).map(([value, label]) => ({
        value: value as NotificationInboxCategory,
        label
      }))
    ],
    []
  );

  async function handleMarkAllRead() {
    await markAllNotificationsRead(workspaceId);
    await Promise.all([reload(), refreshUnread()]);
  }

  function handleUpdated() {
    void Promise.all([reload(), refreshUnread()]);
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Notifications"
        description="Grouped by topic so you can scan work, time, and account updates quickly."
        actions={
          count > 0 ? (
            <Button type="button" size="sm" onClick={() => void handleMarkAllRead()}>
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            value={readFilter}
            onChange={setReadFilter}
            options={readFilterOptions}
          />
          {count > 0 ? <Badge variant="secondary">{count} unread</Badge> : null}
        </div>
        <SegmentedControl
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryFilterOptions}
        />
      </div>

      {!aligned || loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={
            readFilter === "unread"
              ? "No unread notifications"
              : categoryFilter === "all"
                ? "No notifications yet"
                : `No ${NOTIFICATION_INBOX_CATEGORY_LABELS[categoryFilter].toLowerCase()} notifications`
          }
          description={
            readFilter === "unread"
              ? "You're all caught up."
              : "Activity from your workspace will appear here."
          }
        />
      ) : (
        <div className="space-y-8 animate-fade-in motion-reduce:animate-none">
          {groupedItems.map((group) => (
            <section key={group.category} aria-label={group.label} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-border/70" aria-hidden />
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    workspaceId={workspaceId}
                    onUpdated={handleUpdated}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      ) : null}
    </div>
  );
}
