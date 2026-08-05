import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarEntryContent } from "./calendar-entry-content";

describe("CalendarEntryContent", () => {
  it("renders project as the top layer above task, category, and description", () => {
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{
          taskName: "UX research",
          categoryName: "UI/UX Design",
          projectName: "Client Portal"
        }}
        description="Wireframes review"
        durationSec={3600}
        compact={false}
      />
    );

    expect(html).toContain("Client Portal");
    expect(html).toContain("UX research");
    expect(html).toContain("UI/UX Design");
    expect(html).toContain("1h 0m");
    expect(html).toContain("Wireframes review");
    expect(html.indexOf("Client Portal")).toBeLessThan(html.indexOf("UX research"));
    expect(html.indexOf("UX research")).toBeLessThan(html.indexOf("UI/UX Design"));
    expect(html.indexOf("UI/UX Design")).toBeLessThan(html.indexOf("Wireframes review"));
    expect(html).toContain("border-b");
  });

  it("wraps full description in tall compact entries instead of truncating", () => {
    const longDescription =
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{
          taskName: "Release notes",
          categoryName: "Documentation",
          projectName: "Client Portal Redesign"
        }}
        description={longDescription}
        durationSec={9900}
        compact
      />
    );

    expect(html).toContain(longDescription);
    expect(html).toContain("Client Portal Redesign");
    expect(html).toContain("data-line-clamp");
    expect(html.indexOf("Client Portal Redesign")).toBeLessThan(html.indexOf("Release notes"));
    expect(html.indexOf("Release notes")).toBeLessThan(html.indexOf(longDescription));
  });

  it("truncates description only on short entries", () => {
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{ taskName: "Standup", categoryName: "Meetings" }}
        description="Quick sync about blockers"
        durationSec={600}
        compact
      />
    );

    expect(html).toContain("Quick sync about blockers");
    expect(html).toContain("truncate");
  });

  it("shows description on short entries", () => {
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{
          taskName: "Standup",
          categoryName: "Meetings"
        }}
        description="Sprint planning notes"
        durationSec={600}
        compact={false}
      />
    );

    expect(html).toContain("Sprint planning notes");
  });

  it("renders a lock icon for locked entries", () => {
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{
          taskName: "Executive summary",
          categoryName: "Documentation",
          projectName: "Annual Audit"
        }}
        durationSec={6300}
        compact={false}
        variant="locked"
      />
    );

    expect(html).toContain('aria-label="Locked"');
    expect(html).toContain("1h 45m");
    expect(html.indexOf("Annual Audit")).toBeLessThan(html.indexOf("Executive summary"));
  });
});
