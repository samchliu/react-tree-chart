import { describe, expect, it } from "vitest";
import type { TreeNodeData, TreeNodeModel } from "../../types/tree";
import { pruneCollapsedForLayout } from "./pruneCollapsed";

const sample: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "r" },
  children: [
    {
      id: "a",
      data: { label: "a" },
      children: [{ id: "a1", data: { label: "a1" }, children: [] }]
    },
    { id: "b", data: { label: "b" }, children: [] }
  ]
};

describe("pruneCollapsedForLayout", () => {
  it("returns equivalent tree when nothing is collapsed", () => {
    const pruned = pruneCollapsedForLayout(sample, new Set());
    expect(pruned).toEqual(sample);
  });

  it("hides direct children when a node is collapsed", () => {
    const pruned = pruneCollapsedForLayout(sample, new Set(["root"]));
    expect(pruned.children).toEqual([]);
  });

  it("hides only the subtree under a collapsed node", () => {
    const pruned = pruneCollapsedForLayout(sample, new Set(["a"]));
    expect(pruned.children.map((c) => c.id)).toEqual(["a", "b"]);
    const a = pruned.children.find((n) => n.id === "a");
    expect(a?.children).toEqual([]);
  });
});
