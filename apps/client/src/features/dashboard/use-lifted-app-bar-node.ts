"use client";

import { useEffect, useRef } from "react";

/**
 * Publish a PageLayout slot (actions / description / secondary) to a parent.
 * Clears the slot only on unmount. Clearing on every identity change retriggers
 * parent setState and can loop when the child rebuilds the node on that render.
 */
export function useLiftedAppBarNode<T>(node: T, onChange?: (node: T | null) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.(node);
  }, [node]);

  useEffect(() => {
    return () => onChangeRef.current?.(null);
  }, []);
}
