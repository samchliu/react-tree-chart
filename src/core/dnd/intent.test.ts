import { describe, expect, it } from "vitest";
import { detectDropIntent } from "./intent";
import type { TreeNodeModel } from "../../types/tree";

const tree: TreeNodeModel = {
  id: "root",
  data: { label: "root" },
  children: [
    {
      id: "a",
      data: { label: "a" },
      children: [{ id: "a1", data: { label: "a1" }, children: [] }]
    },
    { id: "b", data: { label: "b" }, children: [] }
  ]
};

describe("detectDropIntent", () => {
  it("returns forbidden when moving into descendant", () => {
    const intent = detectDropIntent({
      tree,
      sourceId: "a",
      targetId: "a1",
      cursorXWithinTarget: 10,
      targetWidth: 96
    });
    expect(intent.mode).toBe("forbidden");
  });

  it("returns child when cursor in horizontal middle region", () => {
    const intent = detectDropIntent({
      tree,
      sourceId: "b",
      targetId: "a",
      cursorXWithinTarget: 30,
      targetWidth: 100
    });
    expect(intent.mode).toBe("child");
  });

  it("returns sibling-after when cursor in right outer region", () => {
    const intent = detectDropIntent({
      tree,
      sourceId: "b",
      targetId: "a",
      cursorXWithinTarget: 90,
      targetWidth: 100
    });
    expect(intent.mode).toBe("sibling-after");
    expect(intent.siblingAfterId).toBe("a");
  });
});
