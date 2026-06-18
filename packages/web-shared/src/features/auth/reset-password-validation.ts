export const RESET_PASSWORD_MISMATCH_MESSAGE = "Passwords do not match. Please re-enter.";

export type ResetPasswordFieldErrors = {
  password?: string;
  confirm?: string;
};

export function validateResetPasswordFields(
  password: string,
  confirm: string
): ResetPasswordFieldErrors {
  if (password.length < 8) {
    return { password: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { confirm: RESET_PASSWORD_MISMATCH_MESSAGE };
  }
  return {};
}
