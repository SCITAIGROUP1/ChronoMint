/**
 * Responsive layout tiers shared by package-owned shell behavior and future
 * product layout consumers.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "kloqra-sidebar-collapsed";

/** Viewport width below which the sidebar auto-collapses without a saved preference. */
export const COMPACT_LAPTOP_VIEWPORT_MAX = 1400;

/** Shell container width band for compact laptop layouts. */
export const COMPACT_LAPTOP_SHELL_MIN = 960;
export const COMPACT_LAPTOP_SHELL_MAX = 1100;

/** Shell width where general two-column desktop layouts become comfortable. */
export const COMFORTABLE_DESKTOP_SHELL_MIN = 1101;

/** Shell width where dense export and report flows can use two columns. */
export const EXPORT_TWO_COLUMN_SHELL_MIN = 1280;

/** Standard compact-laptop viewport used by responsive behavior tests. */
export const COMPACT_LAPTOP_VIEWPORT = { width: 1366, height: 768 } as const;
