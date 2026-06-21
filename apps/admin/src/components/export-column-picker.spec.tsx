import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExportColumnPicker } from "./export-column-picker";

describe("ExportColumnPicker", () => {
  it("labels the reset control Reset Columns per #550", () => {
    const html = renderToStaticMarkup(
      <ExportColumnPicker report="time_entries" selected={["date", "member"]} onChange={vi.fn()} />
    );

    expect(html).toContain("Reset Columns");
    expect(html).not.toContain(">Reset columns<");
  });
});
