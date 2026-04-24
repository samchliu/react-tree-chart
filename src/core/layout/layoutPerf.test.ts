import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { computeLayout } from "./computeLayout";
import type { TreeNodeData, TreeNodeModel } from "../../types/tree";

function generateTree(totalNodes: number): TreeNodeModel<TreeNodeData> {
  const root: TreeNodeModel<TreeNodeData> = {
    id: "root",
    data: { label: "root" },
    children: []
  };
  const queue: Array<{ node: TreeNodeModel<TreeNodeData> }> = [{ node: root }];
  let idCounter = 1;

  while (idCounter < totalNodes && queue.length > 0) {
    const { node } = queue.shift()!;
    const remaining = totalNodes - idCounter;
    const childrenCount = Math.min(3, remaining);

    for (let i = 0; i < childrenCount; i++) {
      const child: TreeNodeModel<TreeNodeData> = {
        id: `n-${idCounter++}`,
        data: { label: `n-${idCounter}` },
        children: []
      };
      node.children.push(child);
      queue.push({ node: child });
      if (idCounter >= totalNodes) break;
    }
  }

  return root;
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

describe("computeLayout (perf/overlap)", () => {
  it("computes layout for 300 nodes quickly", () => {
    const tree = generateTree(300);
    const start = performance.now();
    const result = computeLayout(tree, { nodeWidth: 220, nodeHeight: 96 });
    const durationMs = performance.now() - start;

    expect(result.nodes).toHaveLength(300);
    // MVP baseline: 300 nodes should be interactive (test environment variance accepted).
    expect(durationMs).toBeLessThan(250);
  });

  it("does not overlap bounding boxes (axis-aligned)", () => {
    const nodeWidth = 220;
    const nodeHeight = 96;
    const tree = generateTree(120);
    const result = computeLayout(tree, { nodeWidth, nodeHeight });

    const rects = result.nodes.map((n) => ({
      x: n.x - nodeWidth / 2,
      y: n.y - nodeHeight / 2,
      w: nodeWidth,
      h: nodeHeight
    }));

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rectsOverlap(rects[i], rects[j])) {
          throw new Error(`Overlapping rects: ${i} and ${j}`);
        }
      }
    }
  });
});
