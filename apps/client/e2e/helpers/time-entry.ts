import { expect, type Page } from "@playwright/test";

export type TimeEntryDialogOptions = {
  projectName: RegExp | string;
  taskName: RegExp | string;
  description: string;
  startTime?: string;
  endTime?: string;
};

async function selectComboboxOption(page: Page, label: string, option: RegExp | string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

export async function fillTimeEntryDialog(page: Page, options: TimeEntryDialogOptions) {
  await selectComboboxOption(page, "Project", options.projectName);
  await selectComboboxOption(page, "Task", options.taskName);

  if (options.startTime) {
    await page.getByLabel("Start time").fill(options.startTime);
  }
  if (options.endTime) {
    await page.getByLabel("End time").fill(options.endTime);
  }

  await page.getByLabel("Description").fill(options.description);
}

export async function saveTimeEntryDialog(page: Page) {
  await page.getByRole("button", { name: "Log time" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
}

export async function saveTimeEntryChanges(page: Page) {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Time entry updated!")).toBeVisible({ timeout: 15_000 });
}

export function uniqueTimelogMarker(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}
