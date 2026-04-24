import { hierarchy, tree as d3Tree } from "d3-hierarchy";
import type { TreeNodeModel } from "../../types/tree";

/** Minimal tree shape used by internal layout helpers (only `id` and `children` needed). */
type TreeShape = { id: string; children: TreeShape[] };

export type PositionedNode<T> = {
  id: string;
  data: T;
  depth: number;
  /** Horizontal center when custom layout runs; otherwise d3 `x` (same convention as map). */
  x: number;
  /** Vertical center of the node in layout space. */
  y: number;
};

export type LayoutResult<T> = {
  nodes: PositionedNode<T>[];
  width: number;
  height: number;
  /** When custom horizontal layout ran: packed subtree span per node (for bounds / hit testing). */
  subtreeWidthById?: ReadonlyMap<string, number>;
};

export type LayoutOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  /**
   * When set, vertical positions use per-node heights (fallback: `nodeHeight`).
   * **Siblings** (same parent) share one **top** edge; each child row starts at `parentTop + h(parent) + verticalGap`.
   */
  nodeHeights?: ReadonlyMap<string, number>;
  /**
   * When set (or with `nodeHeights`), horizontal packing uses per-node widths (fallback: `nodeWidth`).
   * Sibling subtree spans use each node’s resolved width and `horizontalGap`.
   */
  nodeWidths?: ReadonlyMap<string, number>;
};

const DEFAULTS: Required<Omit<LayoutOptions, "nodeHeights" | "nodeWidths">> = {
  nodeWidth: 220,
  nodeHeight: 96,
  horizontalGap: 48,
  verticalGap: 40
};

function resolveHeight(
  id: string,
  nodeHeights: ReadonlyMap<string, number> | undefined,
  fallback: number
): number {
  const h = nodeHeights?.get(id);
  if (h != null && Number.isFinite(h) && h > 0) {
    return h;
  }
  return fallback;
}

export function resolveNodeWidth(
  id: string,
  nodeWidths: ReadonlyMap<string, number> | undefined,
  fallback: number
): number {
  const w = nodeWidths?.get(id);
  if (w != null && Number.isFinite(w) && w > 0) {
    return w;
  }
  return fallback;
}

function maxNodeWidthInTree(
  node: TreeShape,
  nodeWidths: ReadonlyMap<string, number> | undefined,
  fallback: number
): number {
  let m = resolveNodeWidth(node.id, nodeWidths, fallback);
  for (const c of node.children) {
    m = Math.max(m, maxNodeWidthInTree(c, nodeWidths, fallback));
  }
  return m;
}

/** Top Y per node: siblings share `parentTop + h(parent) + verticalGap`; root top is 0. */
function computeTopByParentSubtree(
  node: TreeShape,
  top: number,
  nodeHeights: ReadonlyMap<string, number>,
  nodeHeight: number,
  verticalGap: number,
  out: Map<string, number>
): void {
  out.set(node.id, top);
  const h = resolveHeight(node.id, nodeHeights, nodeHeight);
  const childTop = top + h + verticalGap;
  for (const child of node.children) {
    computeTopByParentSubtree(
      child,
      childTop,
      nodeHeights,
      nodeHeight,
      verticalGap,
      out
    );
  }
}

/** Horizontal span for the subtree rooted at `node` (per-node card widths + gaps). */
function subtreePackWidth(
  node: TreeShape,
  nodeWidths: ReadonlyMap<string, number> | undefined,
  fallbackWidth: number,
  horizontalGap: number,
  memo: Map<string, number>
): number {
  if (memo.has(node.id)) {
    return memo.get(node.id)!;
  }
  const selfW = resolveNodeWidth(node.id, nodeWidths, fallbackWidth);
  if (node.children.length === 0) {
    memo.set(node.id, selfW);
    return selfW;
  }
  let sum = 0;
  for (const c of node.children) {
    sum += subtreePackWidth(c, nodeWidths, fallbackWidth, horizontalGap, memo);
  }
  sum += horizontalGap * (node.children.length - 1);
  const w = Math.max(selfW, sum);
  memo.set(node.id, w);
  return w;
}

/** Assign horizontal **center** x per node; children ordered by `d3XById` (d3’s breadth order). */
function assignPackedCenters(
  node: TreeShape,
  xCenter: number,
  d3XById: Map<string, number>,
  nodeWidths: ReadonlyMap<string, number> | undefined,
  fallbackWidth: number,
  horizontalGap: number,
  widthMemo: Map<string, number>,
  out: Map<string, number>
): void {
  out.set(node.id, xCenter);
  if (node.children.length === 0) {
    return;
  }
  const sorted = [...node.children].sort(
    (a, b) => (d3XById.get(a.id) ?? 0) - (d3XById.get(b.id) ?? 0)
  );
  const widths = sorted.map((c) =>
    subtreePackWidth(c, nodeWidths, fallbackWidth, horizontalGap, widthMemo)
  );
  const total =
    widths.reduce((s, w) => s + w, 0) + horizontalGap * (sorted.length - 1);
  let left = xCenter - total / 2;
  for (let i = 0; i < sorted.length; i++) {
    const w = widths[i];
    assignPackedCenters(
      sorted[i],
      left + w / 2,
      d3XById,
      nodeWidths,
      fallbackWidth,
      horizontalGap,
      widthMemo,
      out
    );
    left += w + horizontalGap;
  }
}

export function computeLayout<T>(
  tree: TreeNodeModel<T>,
  options: LayoutOptions = {}
): LayoutResult<T> {
  const {
    nodeWidth,
    nodeHeight,
    horizontalGap,
    verticalGap,
    nodeHeights,
    nodeWidths
  } = {
    ...DEFAULTS,
    ...options
  };
  const customLayout = nodeHeights !== undefined || nodeWidths !== undefined;
  const d3NodeWidth = customLayout
    ? maxNodeWidthInTree(tree, nodeWidths, nodeWidth)
    : nodeWidth;

  const root = hierarchy(tree);
  const layout = d3Tree<TreeNodeModel<T>>().nodeSize([
    d3NodeWidth + horizontalGap,
    nodeHeight + verticalGap
  ]);
  const graph = layout(root);

  let nodes: PositionedNode<T>[] = graph.descendants().map((node) => ({
    id: node.data.id,
    data: node.data.data,
    depth: node.depth,
    x: node.x,
    y: node.y
  }));

  if (customLayout) {
    const d3YById = new Map(nodes.map((n) => [n.id, n.y]));
    const d3XById = new Map(nodes.map((n) => [n.id, n.x]));
    const widthMemo = new Map<string, number>();
    subtreePackWidth(tree, nodeWidths, nodeWidth, horizontalGap, widthMemo);
    const xById = new Map<string, number>();
    assignPackedCenters(
      tree,
      0,
      d3XById,
      nodeWidths,
      nodeWidth,
      horizontalGap,
      widthMemo,
      xById
    );

    const topById = new Map<string, number>();
    if (nodeHeights !== undefined) {
      computeTopByParentSubtree(
        tree,
        0,
        nodeHeights,
        nodeHeight,
        verticalGap,
        topById
      );
    }

    nodes = nodes.map((n) => {
      const h = resolveHeight(n.id, nodeHeights, nodeHeight);
      const top = topById.get(n.id);
      const y =
        nodeHeights !== undefined && top !== undefined
          ? top + h / 2
          : (d3YById.get(n.id) ?? n.y);
      return {
        ...n,
        x: xById.get(n.id) ?? n.x,
        y
      };
    });

    const tops = nodes.map((n) => {
      const h = resolveHeight(n.id, nodeHeights, nodeHeight);
      return n.y - h / 2;
    });
    const bottoms = nodes.map((n) => {
      const h = resolveHeight(n.id, nodeHeights, nodeHeight);
      return n.y + h / 2;
    });
    const height = Math.max(...bottoms) - Math.min(...tops);

    let minExtent = Infinity;
    let maxExtent = -Infinity;
    for (const n of nodes) {
      const sw =
        widthMemo.get(n.id) ?? resolveNodeWidth(n.id, nodeWidths, nodeWidth);
      minExtent = Math.min(minExtent, n.x - sw / 2);
      maxExtent = Math.max(maxExtent, n.x + sw / 2);
    }
    const width = maxExtent - minExtent;

    return { nodes, width, height, subtreeWidthById: widthMemo };
  }

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const width = Math.max(...xs) - Math.min(...xs) + nodeWidth;
  const height = Math.max(...ys) - Math.min(...ys) + nodeHeight;

  return { nodes, width, height };
}
