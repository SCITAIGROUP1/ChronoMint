"use client";

import { ROUTES, resolveEffectiveDailyTargetHours } from "@kloqra/contracts";
import type { TimeLogDto, UserProfileDto } from "@kloqra/contracts";
import { Badge, Button, ConfirmDialog, LoadingCrossfade, PageLayout } from "@kloqra/ui";
import {
  api as sharedApi,
  buildMemberSubmissionsHref,
  logStartDateKey,
  parseMemberTimesheetSearch,
  scopedStorageKey,
  SUBMISSIONS_LOOKBACK_WEEKS,
  useDisplayPreferences,
  useMySubmissionsLookbackQuery,
  usePreferenceTodayDateKey,
  useTimelogListQuery,
  useTimelogMutations,
  useTimelogOccupancyQuery,
  useEntryCatalogQueries,
  useTimesheetSubmissionStatusQuery,
  useTenantHolidaysQuery,
  useTenantActivityTypesQuery,
  useUserProfile,
  useWorkspaceOperationalSettings
} from "@kloqra/web-shared";
import { X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildPersonalTimelogsQuery } from "./build-personal-timelogs-query";
import { entryTimesChanged } from "./calendar-entry-chrome";
import type { CalendarTaskInfo } from "./calendar-entry-content";
import {
  addDays,
  addMonths,
  getWeekDays,
  startOfMonth,
  endOfMonth,
  startOfWeekWithPreference,
  startOfDay,
  localMidnightUtcInZone,
  totalSecondsOnDays,
  todayInZone,
  buildDayOccupancySegments,
  calendarDateKey,
  findOccupancyConflict,
  formatOverlapError,
  occupancyConflictLabel,
  rangeOccupiedElsewhere,
  slotIndexFromTime,
  slotIntervalForIndex,
  toDateKeyInZone
} from "./calendar-utils";
import {
  formatDayRangeLabel,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  type TimesheetDisplayFormat
} from "./display-format";
import {
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToBatchBody,
  draftToIsoRange,
  draftToTimelogBody,
  type TimeEntryDraft
} from "./time-entry-draft";
import { clearTimeEntryDraftStorageFor } from "./time-entry-draft-storage";
import { TimeEntryDialog, TimesheetCalendar, TimesheetMonth } from "./timesheet-lazy";
import { TimesheetToolbar } from "./timesheet-toolbar";
import {
  ALL_WEEKDAY_INDEXES,
  filterDaysByVisibleWeekdays,
  parseVisibleWeekdays,
  serializeVisibleWeekdays,
  toggleVisibleWeekday,
  weekdayCheckboxOrder,
  type WeekdayIndex
} from "./timesheet-visible-days";
import {
  defaultTimesheetSlotPx,
  DEFAULT_TIMESHEET_SLOT_PX,
  parseTimesheetSlotPx,
  zoomInSlotPx,
  zoomOutSlotPx,
  type TimesheetSlotPx
} from "./timesheet-zoom";
import { validateTimeEntryOverlap } from "./validate-time-entry-overlap";
import { countDueSubmissions } from "@/features/submissions/use-my-submissions";
import {
  isTimeEntryInactive,
  isTimeEntryLocked,
  LOCKED_ENTRY_MESSAGE
} from "@/features/time-tracker/entry-approval-status";
import { useActiveTimerSession } from "@/hooks/use-active-timer-session";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useJiraIssues } from "@/hooks/use-jira-issues";
import { useMediaQuery } from "@/hooks/use-media-query";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

type ViewMode = "day" | "week" | "month";

function browserTimezone(): string {
  return typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
}

const LEGACY_OVERLAY_KEY = "kloqra-show-occupancy-overlay";
const LEGACY_MOBILE_BANNER_KEY = "kloqra-timesheet-mobile-banner-dismissed";
const LEGACY_MOBILE_VIEW_INIT_KEY = "kloqra-timesheet-mobile-view-init";

function timesheetSessionKey(userId: string, base: string): string {
  const scope = "app";
  return `kloqra:${scope}:${userId}:${base}`;
}

function migrateLegacySessionFlag(legacyKey: string, scopedKey: string): boolean {
  if (sessionStorage.getItem(scopedKey) === "1") return true;
  if (sessionStorage.getItem(legacyKey) === "1") {
    sessionStorage.setItem(scopedKey, "1");
    sessionStorage.removeItem(legacyKey);
    return true;
  }
  return false;
}

export function TimesheetPage() {
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseMemberTimesheetSearch(searchParams.toString()),
    [searchParams]
  );
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const userId = useSessionStore((s) => s.session?.user?.id);
  const isImpersonating = useIsImpersonating();
  const displayPrefs = useDisplayPreferences();
  const [displayFormat, setDisplayFormat] = useState<TimesheetDisplayFormat | null>(null);
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");
  const [jiraConnected, setJiraConnected] = useState(false);

  useEffect(() => {
    setWeekStartPref(displayPrefs.weekStart);
    setDisplayFormat({
      timezone: displayPrefs.timezone,
      dateFormat: displayPrefs.dateFormat,
      timeFormat: displayPrefs.timeFormat
    });
  }, [
    displayPrefs.timezone,
    displayPrefs.weekStart,
    displayPrefs.dateFormat,
    displayPrefs.timeFormat
  ]);

  useEffect(() => {
    if (!ws) return;
    sharedApi<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws })
      .then((profile) => {
        setJiraConnected(profile.jiraConnected ?? false);
      })
      .catch(() => {});
  }, [ws]);

  const timezone = displayFormat?.timezone ?? displayPrefs.timezone;

  const catalog = useEntryCatalogQueries(ws, { enabled: Boolean(ws) });
  const projects = catalog.projects;
  const tasks = catalog.tasks;
  const categories = catalog.categories;
  const { data: holidaysRes } = useTenantHolidaysQuery(ws, Boolean(ws));
  const { data: activityTypesRes } = useTenantActivityTypesQuery(ws, Boolean(ws));
  const activityTypes = activityTypesRes?.items ?? [];
  const holidayDates = useMemo(
    () => new Set((holidaysRes?.items ?? []).filter((h) => h.isActive).map((h) => h.date)),
    [holidaysRes]
  );
  const { profile } = useUserProfile();
  const { dailyTargetHours: workspaceDailyHours } = useWorkspaceOperationalSettings(
    ws,
    Boolean(ws)
  );
  const dailyTargetHours = resolveEffectiveDailyTargetHours(
    profile?.preferences ?? {},
    workspaceDailyHours
  );
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const workspaceNamesById = useMemo(
    () => Object.fromEntries(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces]
  );

  const [view, setView] = useState<ViewMode>(() => deepLink.view ?? "week");
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(true);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [anchor, setAnchor] = useState(() => {
    if (deepLink.date) {
      const parsed = new Date(deepLink.date);
      if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
    }
    return todayInZone(browserTimezone());
  });
  const anchorDateKey = usePreferenceTodayDateKey();
  const { data: lookbackSubmissions = [] } = useMySubmissionsLookbackQuery(
    ws,
    anchorDateKey,
    SUBMISSIONS_LOOKBACK_WEEKS,
    "assigned",
    Boolean(ws)
  );
  const actionableSubmissionCount = useMemo(
    () => countDueSubmissions(lookbackSubmissions),
    [lookbackSubmissions]
  );
  const { issues: jiraIssues } = useJiraIssues(jiraConnected);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);

  const [showOccupancyOverlay, setShowOccupancyOverlay] = useState(true);
  const [visibleWeekdays, setVisibleWeekdays] = useState<WeekdayIndex[]>(() => [
    ...ALL_WEEKDAY_INDEXES
  ]);
  const [slotPx, setSlotPx] = useState<TimesheetSlotPx>(() =>
    defaultTimesheetSlotPx(typeof window === "undefined" ? 900 : window.innerHeight)
  );
  const { active: activeTimer, elapsedSec: liveElapsedSec, tick } = useTimerStore();

  useEffect(() => {
    if (!userId) return;
    if (ws) {
      const overlayKey = scopedStorageKey(
        "show_occupancy_overlay",
        { userId, workspaceId: ws },
        true
      );
      const legacyOverlay = localStorage.getItem(LEGACY_OVERLAY_KEY);
      if (legacyOverlay != null && localStorage.getItem(overlayKey) == null) {
        localStorage.setItem(overlayKey, legacyOverlay);
        localStorage.removeItem(LEGACY_OVERLAY_KEY);
      }
      const overlaySaved = localStorage.getItem(overlayKey) ?? legacyOverlay;
      if (overlaySaved === "false") {
        setShowOccupancyOverlay(false);
      }

      const daysKey = scopedStorageKey(
        "timesheet_visible_weekdays",
        { userId, workspaceId: ws },
        true
      );
      const savedDays = parseVisibleWeekdays(localStorage.getItem(daysKey));
      if (savedDays) {
        setVisibleWeekdays(savedDays);
      }

      const zoomKey = scopedStorageKey("timesheet_slot_px", { userId, workspaceId: ws }, true);
      const savedZoom = parseTimesheetSlotPx(localStorage.getItem(zoomKey));
      if (savedZoom) {
        setSlotPx(savedZoom);
      } else {
        setSlotPx(defaultTimesheetSlotPx(window.innerHeight));
      }
    }
    const bannerKey = timesheetSessionKey(userId, "timesheet_mobile_banner_dismissed");
    setMobileBannerDismissed(migrateLegacySessionFlag(LEGACY_MOBILE_BANNER_KEY, bannerKey));
  }, [userId, ws]);

  useEffect(() => {
    if (!isMobile || !userId) return;
    if (deepLink.view) return;
    const viewInitKey = timesheetSessionKey(userId, "timesheet_mobile_view_init");
    if (migrateLegacySessionFlag(LEGACY_MOBILE_VIEW_INIT_KEY, viewInitKey)) return;
    setView("day");
    sessionStorage.setItem(viewInitKey, "1");
  }, [isMobile, deepLink.view, userId]);

  function dismissMobileBanner() {
    if (!userId) return;
    const bannerKey = timesheetSessionKey(userId, "timesheet_mobile_banner_dismissed");
    sessionStorage.setItem(bannerKey, "1");
    sessionStorage.removeItem(LEGACY_MOBILE_BANNER_KEY);
    setMobileBannerDismissed(true);
  }

  useActiveTimerSession(ws, Boolean(ws));

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const toggleOccupancyOverlay = useCallback(() => {
    setShowOccupancyOverlay((prev) => {
      const next = !prev;
      if (userId && ws) {
        const overlayKey = scopedStorageKey(
          "show_occupancy_overlay",
          { userId, workspaceId: ws },
          true
        );
        localStorage.setItem(overlayKey, String(next));
        localStorage.removeItem(LEGACY_OVERLAY_KEY);
      }
      return next;
    });
  }, [userId, ws]);

  const onVisibleWeekdayChange = useCallback(
    (day: WeekdayIndex, checked: boolean) => {
      setVisibleWeekdays((prev) => {
        const next = toggleVisibleWeekday(prev, day, checked);
        if (userId && ws) {
          const daysKey = scopedStorageKey(
            "timesheet_visible_weekdays",
            { userId, workspaceId: ws },
            true
          );
          localStorage.setItem(daysKey, serializeVisibleWeekdays(next));
        }
        return next;
      });
    },
    [userId, ws]
  );

  const setVisibleWeekdaysPreset = useCallback(
    (next: WeekdayIndex[]) => {
      setVisibleWeekdays(next);
      if (userId && ws) {
        const daysKey = scopedStorageKey(
          "timesheet_visible_weekdays",
          { userId, workspaceId: ws },
          true
        );
        localStorage.setItem(daysKey, serializeVisibleWeekdays(next));
      }
    },
    [userId, ws]
  );

  const persistSlotPx = useCallback(
    (next: TimesheetSlotPx) => {
      setSlotPx(next);
      if (userId && ws) {
        const zoomKey = scopedStorageKey("timesheet_slot_px", { userId, workspaceId: ws }, true);
        localStorage.setItem(zoomKey, String(next));
      }
    },
    [userId, ws]
  );

  const onZoomIn = useCallback(() => {
    persistSlotPx(zoomInSlotPx(slotPx));
  }, [persistSlotPx, slotPx]);

  const onZoomOut = useCallback(() => {
    persistSlotPx(zoomOutSlotPx(slotPx));
  }, [persistSlotPx, slotPx]);

  const onZoomReset = useCallback(() => {
    persistSlotPx(DEFAULT_TIMESHEET_SLOT_PX);
  }, [persistSlotPx]);

  const weekStart = useMemo(
    () => startOfWeekWithPreference(anchor, weekStartPref),
    [anchor, weekStartPref]
  );
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);

  const projectForTask = useCallback(
    (taskId: string | null | undefined) => {
      if (!taskId) return undefined;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      return projects.find((p) => p.id === task.projectId);
    },
    [tasks, projects]
  );

  const taskForLog = useCallback(
    (taskId: string | null | undefined) =>
      taskId ? tasks.find((t) => t.id === taskId) : undefined,
    [tasks]
  );

  const categoryForTask = useCallback(
    (taskId: string | null | undefined) => {
      if (!taskId) return undefined;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      return categories.find((c) => c.id === task.categoryId);
    },
    [tasks, categories]
  );

  const isTimerEntry = useCallback((log: TimeLogDto) => log.source === "timer", []);

  const calendarDays = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") {
      return filterDaysByVisibleWeekdays(getWeekDays(weekStart), visibleWeekdays);
    }
    return [];
  }, [view, anchor, weekStart, visibleWeekdays]);

  const periodDays = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") return getWeekDays(weekStart);
    const first = startOfMonth(monthStart);
    const last = endOfMonth(monthStart);
    return Array.from(
      { length: last.getDate() },
      (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1)
    );
  }, [view, anchor, weekStart, monthStart]);

  const weekdayOrder = useMemo(() => weekdayCheckboxOrder(weekStartPref), [weekStartPref]);

  const visibleRange = useMemo(() => {
    if (view === "day") {
      const y = anchor.getFullYear();
      const m = anchor.getMonth() + 1;
      const d = anchor.getDate();
      const from = localMidnightUtcInZone(y, m, d, timezone);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    }
    if (view === "week") {
      const y = weekStart.getFullYear();
      const m = weekStart.getMonth() + 1;
      const d = weekStart.getDate();
      const from = localMidnightUtcInZone(y, m, d, timezone);
      const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { from, to };
    }
    if (view === "month") {
      const y = monthStart.getFullYear();
      const m = monthStart.getMonth() + 1;
      const from = localMidnightUtcInZone(y, m, 1, timezone);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const to = new Date(
        localMidnightUtcInZone(y, m, lastDay, timezone).getTime() + 24 * 60 * 60 * 1000
      );
      return { from, to };
    }
    return null;
  }, [view, anchor, weekStart, monthStart, timezone]);

  const logsPath = useMemo(
    () =>
      visibleRange && userId
        ? buildPersonalTimelogsQuery(visibleRange.from, visibleRange.to, userId)
        : ROUTES.TIMELOGS.LIST,
    [visibleRange, userId]
  );

  const {
    data: logsData,
    isLoading: logsQueryLoading,
    error: logsQueryError,
    refetch: refetchLogs
  } = useTimelogListQuery(ws, logsPath, Boolean(ws && visibleRange && userId));

  const { data: occupancy = [] } = useTimelogOccupancyQuery(
    ws,
    visibleRange?.from.toISOString(),
    visibleRange?.to.toISOString(),
    Boolean(ws && visibleRange)
  );

  const logs = useMemo(
    () => (logsData?.items ?? []).filter((log) => !userId || log.userId === userId),
    [logsData?.items, userId]
  );

  const periodTotalSec = useMemo(() => {
    const timerState = isActiveTimer(activeTimer)
      ? {
          startedAt: activeTimer.startedAt,
          isPaused: activeTimer.isPaused ?? false,
          elapsedSec: activeTimer.elapsedSec,
          liveElapsedSec
        }
      : null;
    return totalSecondsOnDays(logs, periodDays, timezone, timerState);
  }, [logs, periodDays, timezone, activeTimer, liveElapsedSec]);
  // Occupancy refetches after saves — do not hide the calendar; list patch/refetch owns entries.
  const calendarLoading = logsQueryLoading || catalog.isLoading;

  const submissionDates = useMemo(() => {
    const dates = new Set<string>([toDateKeyInZone(anchor, timezone)]);
    for (const log of logs) {
      dates.add(logStartDateKey(log, timezone));
    }
    return [...dates];
  }, [anchor, logs, timezone]);

  const { submissionByKey } = useTimesheetSubmissionStatusQuery(
    ws,
    submissionDates,
    Boolean(ws),
    timezone
  );

  const isEntryInactive = useCallback(
    (log: TimeLogDto) =>
      isTimeEntryInactive(
        projectForTask(log.taskId),
        taskForLog(log.taskId),
        categoryForTask(log.taskId)
      ),
    [projectForTask, taskForLog, categoryForTask]
  );

  const isSubmissionLocked = useCallback(
    (log: TimeLogDto) => isTimeEntryLocked(log, projectForTask(log.taskId), submissionByKey),
    [projectForTask, submissionByKey]
  );

  const isEntryReadOnly = useCallback(
    (log: TimeLogDto) =>
      isEntryInactive(log) || isSubmissionLocked(log) || Boolean(userId && log.userId !== userId),
    [isEntryInactive, isSubmissionLocked, userId]
  );

  const rangeLabel = useMemo(() => {
    if (!displayFormat) {
      const tzOpts = timezone ? { timeZone: timezone } : undefined;
      if (view === "day") return anchor.toLocaleDateString(undefined, tzOpts);
      if (view === "week") return weekStart.toLocaleDateString(undefined, tzOpts);
      return monthStart.toLocaleDateString(undefined, tzOpts);
    }
    if (view === "day") return formatDayRangeLabel(anchor, displayFormat);
    if (view === "week") return formatWeekRangeLabel(weekStart, displayFormat);
    return formatMonthYearLabel(monthStart, displayFormat);
  }, [view, anchor, weekStart, monthStart, displayFormat, timezone]);

  const taskLabel = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return "Unknown task";
      const project = projects.find((p) => p.id === task.projectId);
      return formatTaskLabel(project, task.taskName, workspaceNamesById);
    },
    [tasks, projects, workspaceNamesById]
  );

  const taskInfo = useCallback(
    (taskId: string, log?: TimeLogDto): CalendarTaskInfo => {
      if (log && !log.taskId) {
        return {
          taskName: log.activityTypeName ?? log.holidayName ?? "Organization time",
          categoryName: log.classification === "TENANT_ACTIVITY" ? "Activity" : "Time off",
          projectName: log.holidayName ?? log.activityTypeName ?? undefined
        };
      }
      const task = tasks.find((t) => t.id === taskId);
      const project = task ? projects.find((p) => p.id === task.projectId) : undefined;
      return {
        taskName: task?.taskName ?? "Unknown task",
        categoryName: task?.categoryName ?? "General",
        projectName: project?.name
      };
    },
    [tasks, projects]
  );

  const entryColor = useCallback(
    (taskId: string) => colorForTask(taskId, tasks, projects),
    [tasks, projects]
  );

  useEffect(() => {
    if (!logsQueryError) return;
    toast.error(
      logsQueryError instanceof Error ? logsQueryError.message : "Could not load time entries."
    );
  }, [logsQueryError]);

  // Patch the mounted list cache path; do not block UI on a full list refetch.
  const timelogMutations = useTimelogMutations(ws, {
    onLocalRefresh: () => {
      void refetchLogs();
    },
    listPaths: [logsPath]
  });

  const overlapConflictMessage = useCallback(
    (conflict: { workspaceName: string; label: string; startTime: string; endTime: string }) => {
      return formatOverlapError(
        occupancyConflictLabel(conflict),
        new Date(conflict.startTime),
        new Date(conflict.endTime),
        timezone
      );
    },
    [timezone]
  );

  useEffect(() => {
    if (!deepLink.date) return;
    const parsed = new Date(deepLink.date);
    if (!Number.isNaN(parsed.getTime())) {
      setAnchor(startOfDay(parsed));
    }
  }, [deepLink.date]);

  useEffect(() => {
    if (deepLink.view) {
      setView(deepLink.view);
    }
  }, [deepLink.view]);

  useEffect(() => {
    if (timezone && !deepLink.date) {
      setAnchor(todayInZone(timezone));
    }
  }, [timezone, deepLink.date]);

  function goToday() {
    setAnchor(todayInZone(timezone));
  }

  function goPrev() {
    if (view === "month") setAnchor((d) => addMonths(d, -1));
    else if (view === "day") setAnchor((d) => addDays(d, -1));
    else setAnchor((d) => addDays(d, -7));
  }

  function goNext() {
    if (view === "month") setAnchor((d) => addMonths(d, 1));
    else if (view === "day") setAnchor((d) => addDays(d, 1));
    else setAnchor((d) => addDays(d, 7));
  }

  function openDraft(next: TimeEntryDraft, log: TimeLogDto | null = null) {
    setEditingLog(log);
    setDraft(next);
    setError(null);
    setDialogOpen(true);
  }

  function openCreateSlot(day: Date, hour: number, minute: number) {
    if (isImpersonating) return;
    if (showOccupancyOverlay) {
      const index = slotIndexFromTime(hour, minute);
      if (index >= 0) {
        const dateKey = calendarDateKey(day, timezone);
        const segments = buildDayOccupancySegments(dateKey, occupancy, timezone, ws);
        const { start, end } = slotIntervalForIndex(dateKey, index, timezone);
        const conflict = segments.find((seg) => start < seg.end && end > seg.start);
        if (conflict) {
          const msg = formatOverlapError(
            `${conflict.workspaceName}: ${conflict.label}`,
            conflict.start,
            conflict.end,
            timezone
          );
          setError(msg);
          toast.error(msg);
          return;
        }
      }
    }
    openDraft(draftFromSlot(day, hour, minute, timezone));
  }

  function openCreateRange(day: Date, startIndex: number, endIndex: number) {
    if (isImpersonating) return;
    if (showOccupancyOverlay) {
      const dateKey = calendarDateKey(day, timezone);
      const segments = buildDayOccupancySegments(dateKey, occupancy, timezone, ws);
      const conflict = rangeOccupiedElsewhere(dateKey, startIndex, endIndex, segments, timezone);
      if (conflict) {
        const msg = formatOverlapError(
          `${conflict.workspaceName}: ${conflict.label}`,
          conflict.start,
          conflict.end,
          timezone
        );
        setError(msg);
        toast.error(msg);
        return;
      }
    }
    openDraft(draftFromSlotRange(day, startIndex, endIndex, timezone));
  }

  function openEditEntry(log: TimeLogDto) {
    openDraft(draftFromLog(log, tasks, timezone), log);
  }

  function closeDialog() {
    clearTimeEntryDraftStorageFor(ws, editingLog?.id ?? null);
    setDialogOpen(false);
    setEditingLog(null);
    setDraft(null);
    setError(null);
  }

  async function saveEntry() {
    if (isImpersonating) return;
    if (savingRef.current) return;
    if (editingLog && isEntryReadOnly(editingLog)) return;
    if (!draft || !canSaveTaskDraft(draft)) {
      setError("Select a project and a task, or an organization time type.");
      return;
    }
    const { startTime, endTime } = draftToIsoRange(draft, timezone);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }
    const isRecurring = !editingLog && draft.recurrence && draft.recurrence !== "none";
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const overlapMsg = await validateTimeEntryOverlap(ws, start, end, timezone, editingLog?.id);
      if (overlapMsg) {
        setError(overlapMsg);
        toast.error(overlapMsg);
        return;
      }
      const classification = draft.classification ?? "PROJECT";
      if (isRecurring) {
        if (!draft.repeatUntil) {
          setError("Please select an end date for the recurrence.");
          return;
        }
        if (!draft.recurrence || draft.recurrence === "none") {
          setError("Select a recurrence pattern.");
          return;
        }
        const body = draftToBatchBody(draft, timezone, {
          tasks,
          activityTypes
        });
        const res = await timelogMutations.createBatch(body);
        closeDialog();
        if (res.skippedCount > 0) {
          toast.success(
            `Logged ${res.createdCount} entries. Skipped ${res.skippedCount} conflicts.`
          );
        } else {
          toast.success(`Logged ${res.createdCount} recurring entries!`);
        }
      } else {
        const body = draftToTimelogBody(draft, timezone, {
          tasks,
          activityTypes
        });
        if (classification === "PROJECT" && !draft.taskSelection) {
          setError("Select a task to log time.");
          return;
        }
        if (editingLog) {
          await timelogMutations.update(editingLog.id, body);
        } else {
          await timelogMutations.create(body);
        }
        closeDialog();
        toast.success(editingLog ? "Time entry updated!" : "Time entry created!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save entry";
      setError(msg);
      toast.error(msg);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function deleteEntry(log?: TimeLogDto) {
    if (isImpersonating) return;
    const target = log ?? editingLog;
    if (!target) return;
    if (isEntryReadOnly(target)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setConfirmDeleteLog(target);
  }

  async function confirmDelete() {
    if (isImpersonating) return;
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    if (isEntryReadOnly(target)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await timelogMutations.remove(target.id);
      if (editingLog?.id === target.id) closeDialog();
      toast.success("Time entry deleted!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete entry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateEntry(log: TimeLogDto, start: Date, end: Date) {
    if (isImpersonating || isEntryReadOnly(log)) return;
    if (end <= start) return;
    const conflict = findOccupancyConflict(occupancy, start, end);
    if (conflict) {
      const msg = overlapConflictMessage(conflict);
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    try {
      const created = await timelogMutations.create(
        log.classification && log.classification !== "PROJECT"
          ? {
              classification: log.classification,
              activityTypeId: log.activityTypeId ?? undefined,
              holidayId: log.holidayId ?? undefined,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              description: log.description ?? undefined,
              isBillable: false
            }
          : {
              taskId: log.taskId ?? undefined,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              description: log.description ?? undefined,
              isBillable: log.isBillable
            }
      );
      toast.success("Time entry duplicated!");
      startTransition(() => {
        openDraft(draftFromLog(created, tasks, timezone), created);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate entry";
      setError(msg);
      toast.error(msg);
    }
  }

  async function updateEntryTimes(log: TimeLogDto, start: Date, end: Date, errorLabel: string) {
    if (isImpersonating || isEntryReadOnly(log)) return;
    if (end <= start) return;
    if (!entryTimesChanged(log, start, end)) return;

    const conflict = findOccupancyConflict(occupancy, start, end, log.id);
    if (conflict) {
      const msg = overlapConflictMessage(conflict);
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    try {
      await timelogMutations.update(log.id, {
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      toast.success("Time entry updated!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : errorLabel;
      setError(msg);
      toast.error(msg);
    }
  }

  const resizeEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not resize entry");

  const moveEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not move entry");

  function onMonthDayClick(day: Date) {
    setAnchor(startOfDay(day));
    setView("day");
  }

  return (
    <PageLayout
      title={
        <span className="inline-flex items-center gap-2">
          Timesheet
          <Badge variant="secondary" className="font-normal text-xs">
            {timezone}
          </Badge>
        </span>
      }
      titleLabel="Timesheet"
      description="Log time on the calendar."
      secondary={
        <TimesheetToolbar
          view={view}
          anchor={anchor}
          rangeLabel={rangeLabel}
          weekStartPref={weekStartPref}
          periodTotalSec={periodTotalSec}
          visibleWeekdays={visibleWeekdays}
          weekdayOrder={weekdayOrder}
          onWeekdaysPreset={setVisibleWeekdaysPreset}
          onVisibleWeekdayChange={onVisibleWeekdayChange}
          showOccupancyOverlay={showOccupancyOverlay}
          onToggleOccupancy={toggleOccupancyOverlay}
          onToday={goToday}
          onPrev={goPrev}
          onNext={goNext}
          onAnchorChange={setAnchor}
          onViewChange={setView}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {actionableSubmissionCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <p>
              {actionableSubmissionCount} period{actionableSubmissionCount === 1 ? "" : "s"} ready
              to submit for review.
            </p>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0">
              <Link href={buildMemberSubmissionsHref({ tab: "action" })}>Go to Submissions</Link>
            </Button>
          </div>
        ) : null}

        {isMobile && !mobileBannerDismissed ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm md:hidden">
            <p className="text-foreground">
              On mobile,{" "}
              <Link
                href="/time-tracker"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Time Tracker
              </Link>{" "}
              is easier for viewing and editing entries.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link href="/time-tracker">Open</Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={dismissMobileBanner}
                aria-label="Dismiss mobile tip"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

        <LoadingCrossfade
          loading={calendarLoading}
          loaderLabel="Loading timesheet…"
          className="flex min-h-0 flex-1 flex-col"
        >
          {view === "month" ? (
            <TimesheetMonth
              month={monthStart}
              logs={logs}
              entryColor={entryColor}
              holidayDates={holidayDates}
              onDayClick={onMonthDayClick}
              timezone={timezone}
            />
          ) : (
            <TimesheetCalendar
              view={view}
              days={calendarDays}
              logs={logs}
              occupancy={occupancy}
              workspaceId={ws}
              showOccupancyOverlay={showOccupancyOverlay}
              taskName={(id) => taskLabel(id)}
              taskInfo={taskInfo}
              entryColor={entryColor}
              holidayDates={holidayDates}
              activeTimer={isActiveTimer(activeTimer) ? activeTimer : null}
              liveElapsedSec={liveElapsedSec}
              isEntryLocked={isSubmissionLocked}
              isEntryInactive={isEntryInactive}
              isTimerEntry={isTimerEntry}
              overlapConflictMessage={overlapConflictMessage}
              onSlotClick={openCreateSlot}
              onSlotRangeSelect={openCreateRange}
              onEntryClick={openEditEntry}
              onEntryResize={resizeEntry}
              onEntryMove={moveEntry}
              onEntryDuplicate={duplicateEntry}
              readOnly={isImpersonating}
              timezone={timezone}
              displayFormat={displayFormat ?? undefined}
              slotPx={slotPx}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onZoomReset={onZoomReset}
              className="min-h-0 flex-1"
            />
          )}
        </LoadingCrossfade>
      </div>

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Log time"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        categories={categories}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        editingLog={editingLog}
        saving={saving}
        error={error}
        readOnly={isImpersonating || (editingLog ? isEntryReadOnly(editingLog) : false)}
        workspaceId={ws}
        onClose={closeDialog}
        onDraftChange={setDraft}
        onSave={saveEntry}
        onDelete={
          !isImpersonating && editingLog && !isEntryReadOnly(editingLog) ? deleteEntry : undefined
        }
        timezone={timezone}
        jiraSuggestions={jiraIssues}
        activityTypes={activityTypes}
        dailyTargetHours={dailyTargetHours}
      />

      <ConfirmDialog
        open={confirmDeleteLog !== null}
        title="Delete this entry?"
        description="This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDeleteLog(null)}
      />
    </PageLayout>
  );
}
