import { expect, type Page } from "@playwright/test";

/** Matches packages/web-shared/src/responsive-tiers.ts */
export const COMPACT_LAPTOP_VIEWPORT = { width: 1366, height: 768 } as const;

/** Phone viewport used by compact-admin UX assertions. */
export const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

export async function assertNoHorizontalPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}

export async function useCompactLaptopViewport(page: Page) {
  await page.setViewportSize(COMPACT_LAPTOP_VIEWPORT);
}

export async function usePhoneViewport(page: Page) {
  await page.setViewportSize(PHONE_VIEWPORT);
}
