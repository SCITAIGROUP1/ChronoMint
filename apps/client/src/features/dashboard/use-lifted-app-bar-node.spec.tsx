/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useLiftedAppBarNode } from "./use-lifted-app-bar-node";

const UPDATE_DEPTH_LIMIT = 25;

function Parent() {
  const renders = useRef(0);
  renders.current += 1;
  if (renders.current > UPDATE_DEPTH_LIMIT) {
    throw new Error("Maximum update depth exceeded");
  }
  const [slot, setSlot] = useState<ReactNode>(null);
  const onChange = useCallback((node: ReactNode | null) => {
    setSlot(node);
  }, []);
  return (
    <div>
      <div data-testid="slot">{slot}</div>
      <Child onChange={onChange} />
    </div>
  );
}

function Child({ onChange }: { onChange: (node: ReactNode | null) => void }) {
  const handlePreset = useCallback(() => {}, []);
  const projects = useMemo(() => [{ id: "1", name: "Atlas" }], []);
  const node = useMemo(
    () => (
      <button type="button" data-testid="filter">
        {projects[0]?.name}
      </button>
    ),
    [handlePreset, projects]
  );
  useLiftedAppBarNode(node, onChange);
  return <div>grid</div>;
}

describe("useLiftedAppBarNode", () => {
  afterEach(cleanup);

  it("does not loop when parent state stores the published node", () => {
    expect(() => render(<Parent />)).not.toThrow();
    expect(screen.getByTestId("filter").textContent).toBe("Atlas");
    expect(screen.getByText("grid")).toBeTruthy();
  });
});
