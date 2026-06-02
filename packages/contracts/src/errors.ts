export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TIMELOG_OVERLAP: "TIMELOG_OVERLAP",
  TIMER_ALREADY_ACTIVE: "TIMER_ALREADY_ACTIVE",
  TIMER_NOT_ACTIVE: "TIMER_NOT_ACTIVE",
  TIMELOG_NOT_EDITABLE: "TIMELOG_NOT_EDITABLE",
  WORKSPACE_REQUIRED: "WORKSPACE_REQUIRED",
  EMAIL_EXISTS: "EMAIL_EXISTS"
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
