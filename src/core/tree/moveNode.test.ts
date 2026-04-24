import { describe, expect, it } from "vitest";
import { canMoveNode, moveNode } from "./moveNode";
import type { TreeNodeData, TreeNodeModel } from "../../types/tree";

const tree: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "Root" },
  children: [
    {
      id: "a",
      data: { label: "A" },
      children: [{ id: "a1", data: { label: "A1" }, children: [] }]
    },
    { id: "b", data: { label: "B" }, children: [] }
  ]
};

describe("moveNode", () => {
  it("moves node as child", () => {
    const next = moveNode({
      tree,
      sourceId: "b",
      targetId: "a",
      mode: "child"
    });
    expect(next.children[0].children.map((n) => n.id)).toContain("b");
  });

  it("blocks moving parent into its descendant", () => {
    expect(canMoveNode(tree, "a", "a1")).toBe(false);
  });
});
