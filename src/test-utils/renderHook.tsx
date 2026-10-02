// Minimal hook renderer for tests (no @testing-library dependency).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

export async function renderHook<T>(useHook: () => T): Promise<{ current: () => T }> {
  let latest: T;
  function Probe() {
    latest = useHook();
    return null;
  }
  await act(async () => {
    TestRenderer.create(<Probe />);
  });
  return { current: () => latest };
}

/** Runs an async action inside act() and lets effects settle. */
export async function settle<R>(fn: () => Promise<R>): Promise<R> {
  let result!: R;
  await act(async () => {
    result = await fn();
  });
  return result;
}
