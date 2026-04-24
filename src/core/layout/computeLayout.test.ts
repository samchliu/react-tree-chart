import { describe, expect, it } from "vitest";
import { computeLayout } from "./computeLayout";
import type { TreeNodeData, TreeNodeModel } from "../../types/tree";

const tree: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "Root" },
  children: [
    { id: "a", data: { label: "A" }, children: [] },
    { id: "b", data: { label: "B" }, children: [] }
  ]
};

describe("computeLayout", () => {
  it("returns positioned nodes for whole tree", () => {
    const result = computeLayout(tree);
    expect(result.nodes).toHaveLength(3);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("top-aligns siblings at the same depth when using per-node heights", () => {
    const opts = { nodeWidth: 220, nodeHeight: 96, verticalGap: 40 } as const;
    const result = computeLayout(tree, {
      ...opts,
      nodeHeights: new Map([
        ["a", 60],
        ["b", 120]
      ])
    });
    const a = result.nodes.find((n) => n.id === "a")!;
    const b = result.nodes.find((n) => n.id === "b")!;
    const topA = a.y - 60 / 2;
    const topB = b.y - 120 / 2;
    expect(topA).toBeCloseTo(topB, 5);
  });

  it("packs sibling centers using subtree widths and horizontalGap", () => {
    const t: TreeNodeModel<TreeNodeData> = {
      id: "root",
      data: { label: "R" },
      children: [
        { id: "a", data: { label: "A" }, children: [] },
        { id: "b", data: { label: "B" }, children: [] }
      ]
    };
    const nw = 100;
    const hg = 10;
    const result = computeLayout(t, {
      nodeWidth: nw,
      horizontalGap: hg,
      nodeHeight: 40,
      verticalGap: 8,
      nodeHeights: new Map([
        ["root", 40],
        ["a", 40],
        ["b", 40]
      ])
    });
    const a = result.nodes.find((n) => n.id === "a")!;
    const b = result.nodes.find((n) => n.id === "b")!;
    expect(Math.abs(a.x - b.x)).toBeCloseTo(nw + hg, 5);
    expect(result.subtreeWidthById?.get("a")).toBe(nw);
    expect(result.subtreeWidthById?.get("root")).toBe(nw + hg + nw);
  });

  it("top-aligns only siblings; children start below their own parent", () => {
    const overlapTree: TreeNodeModel<TreeNodeData> = {
      id: "root",
      data: { label: "R" },
      children: [
        { id: "tall", data: { label: "T" }, children: [] },
        {
          id: "short",
          data: { label: "S" },
          children: [{ id: "leaf", data: { label: "L" }, children: [] }]
        }
      ]
    };
    const opts = { nodeWidth: 220, nodeHeight: 96, verticalGap: 40 } as const;
    const hShort = 50;
    const hLeaf = 40;
    const result = computeLayout(overlapTree, {
      ...opts,
      nodeHeights: new Map([
        ["tall", 300],
        ["short", hShort],
        ["leaf", hLeaf]
      ])
    });
    const tall = result.nodes.find((n) => n.id === "tall")!;
    const shortN = result.nodes.find((n) => n.id === "short")!;
    const leaf = result.nodes.find((n) => n.id === "leaf")!;
    const topTall = tall.y - 300 / 2;
    const topShort = shortN.y - hShort / 2;
    expect(topTall).toBeCloseTo(topShort, 5);
    const shortBottom = shortN.y + hShort / 2;
    const leafTop = leaf.y - hLeaf / 2;
    expect(leafTop).toBeCloseTo(shortBottom + opts.verticalGap, 5);
  });

  it("uses taller per-node heights to increase depth separation", () => {
    const opts = { nodeWidth: 220, nodeHeight: 96, verticalGap: 40 } as const;
    const fixed = computeLayout(tree, opts);
    const dynamic = computeLayout(tree, {
      ...opts,
      nodeHeights: new Map([["a", 200]])
    });
    const fixedRoot = fixed.nodes.find((n) => n.id === "root")!;
    const fixedA = fixed.nodes.find((n) => n.id === "a")!;
    const dynRoot = dynamic.nodes.find((n) => n.id === "root")!;
    const dynA = dynamic.nodes.find((n) => n.id === "a")!;
    const fixedSep = Math.abs(fixedA.y - fixedRoot.y);
    const dynSep = Math.abs(dynA.y - dynRoot.y);
    expect(dynSep).toBeGreaterThan(fixedSep);
  });

  it("packs sibling centers using per-node widths and horizontalGap", () => {
    const t: TreeNodeModel<TreeNodeData> = {
      id: "root",
      data: { label: "R" },
      children: [
        { id: "a", data: { label: "A" }, children: [] },
        { id: "b", data: { label: "B" }, children: [] }
      ]
    };
    const wa = 60;
    const wb = 140;
    const hg = 10;
    const result = computeLayout(t, {
      nodeWidth: 100,
      horizontalGap: hg,
      nodeHeight: 40,
      verticalGap: 8,
      nodeWidths: new Map([
        ["root", 100],
        ["a", wa],
        ["b", wb]
      ])
    });
    const a = result.nodes.find((n) => n.id === "a")!;
    const b = result.nodes.find((n) => n.id === "b")!;
    expect(Math.abs(a.x - b.x)).toBeCloseTo(wa / 2 + hg + wb / 2, 5);
    expect(result.subtreeWidthById?.get("a")).toBe(wa);
    expect(result.subtreeWidthById?.get("root")).toBe(wa + hg + wb);
  });

  it("with only nodeWidths, keeps d3 vertical positions when d3 horizontal stride matches default", () => {
    const opts = {
      nodeWidth: 220,
      nodeHeight: 96,
      horizontalGap: 48,
      verticalGap: 40
    } as const;
    const base = computeLayout(tree, opts);
    const withWidths = computeLayout(tree, {
      ...opts,
      nodeWidths: new Map([
        ["a", 100],
        ["b", 100]
      ])
    });
    for (const id of ["root", "a", "b"]) {
      const y0 = base.nodes.find((n) => n.id === id)!.y;
      const y1 = withWidths.nodes.find((n) => n.id === id)!.y;
      expect(y1).toBeCloseTo(y0, 5);
    }
    const a = withWidths.nodes.find((n) => n.id === "a")!;
    const b = withWidths.nodes.find((n) => n.id === "b")!;
    expect(Math.abs(a.x - b.x)).toBeCloseTo(
      100 / 2 + opts.horizontalGap + 100 / 2,
      5
    );
  });
});
