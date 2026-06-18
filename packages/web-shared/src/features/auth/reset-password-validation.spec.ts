import { describe, expect, it } from "vitest";
import {
  RESET_PASSWORD_MISMATCH_MESSAGE,
  validateResetPasswordFields
} from "./reset-password-validation";

describe("validateResetPasswordFields", () => {
  it("uses AC copy for password mismatch", () => {
    expect(validateResetPasswordFields("password123", "password124")).toEqual({
      confirm: RESET_PASSWORD_MISMATCH_MESSAGE
    });
    expect(RESET_PASSWORD_MISMATCH_MESSAGE).toBe("Passwords do not match. Please re-enter.");
  });

  it("requires minimum password length first", () => {
    expect(validateResetPasswordFields("short", "other")).toEqual({
      password: "Password must be at least 8 characters."
    });
  });

  it("accepts matching passwords", () => {
    expect(validateResetPasswordFields("password123", "password123")).toEqual({});
  });
});
