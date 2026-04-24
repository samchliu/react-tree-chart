import { describe, expect, it } from "vitest";
import { stabilizeDropIntent } from "./stabilizeDropIntent";
import type { DropIntent } from "../../types/tree";

describe("stabilizeDropIntent", () => {
  it("returns nextIntent when there is no previous intent", () => {
    const next: DropIntent = {
      mode: "sibling-after",
      sourceId: "a",
      targetId: "b",
      siblingAfterId: "b"
    };
    const { intent, pending } = stabilizeDropIntent({
      prevIntent: undefined,
      nextIntent: next,
      cursorRatio: 0.5,
      pending: null
    });
    expect(intent).toEqual(next);
    expect(pending).toBeNull();
  });

  it("applies hysteresis to keep child mode when cursor stays in middle band", () => {
    const prev: DropIntent = { mode: "child", sourceId: "a", targetId: "b" };
    const next: DropIntent = {
      mode: "sibling-before",
      sourceId: "a",
      targetId: "b"
    };
    const { intent } = stabilizeDropIntent({
      prevIntent: prev,
      nextIntent: next,
      cursorRatio: 0.5,
      pending: null
    });
    expect(intent.mode).toBe("child");
  });

  it("clears pending when source/target pair is unchanged after stabilization", () => {
    const prev: DropIntent = { mode: "child", sourceId: "a", targetId: "b" };
    const { intent, pending } = stabilizeDropIntent({
      prevIntent: prev,
      nextIntent: prev,
      cursorRatio: 0.5,
      pending: { targetId: "x", mode: "child", hits: 1 }
    });
    expect(intent).toEqual(prev);
    expect(pending).toBeNull();
  });

  it("requires two hits before accepting a new target switch", () => {
    const prev: DropIntent = { mode: "child", sourceId: "a", targetId: "b" };
    const next: DropIntent = { mode: "child", sourceId: "a", targetId: "c" };
    const first = stabilizeDropIntent({
      prevIntent: prev,
      nextIntent: next,
      cursorRatio: 0.5,
      pending: null
    });
    expect(first.intent).toEqual(prev);
    expect(first.pending?.targetId).toBe("c");
    expect(first.pending?.hits).toBe(1);

    const second = stabilizeDropIntent({
      prevIntent: prev,
      nextIntent: next,
      cursorRatio: 0.5,
      pending: first.pending
    });
    expect(second.intent).toEqual(next);
    expect(second.pending?.hits).toBe(2);
  });
});
