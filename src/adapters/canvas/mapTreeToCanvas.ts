import type { TreeNodeModel } from "../../types/tree";
import {
  computeLayout,
  resolveNodeWidth
} from "../../core/layout/computeLayout";

type MapOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  /** When set, layout and bounds use these heights (missing ids fall back to `nodeHeight`). */
  nodeHeights?: ReadonlyMap<string, number>;
  /** When set, layout and card horizontal bounds use these widths (missing ids fall back to `nodeWidth`). */
  nodeWidths?: ReadonlyMap<string, number>;
  /** Minimum horizontal distance between sibling subtrees. */
  horizontalGap?: number;
  /** Minimum vertical distance between a parent node and its children row. */
  verticalGap?: number;
};

export type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type CanvasNode<T> = {
  id: string;
  position: { x: number; y: number };
  /** Layout fields plus view-only fields merged by `TreeChart` (intent, collapse UI, etc.). */
  data: T & { depth: number };
};

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
};

const EMPTY_BOUNDS: ContentBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };

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

export function mapTreeToCanvas<T>(
  tree: TreeNodeModel<T>,
  options: MapOptions = {}
): { nodes: CanvasNode<T>[]; edges: CanvasEdge[]; contentBounds: ContentBounds } {
  const nodeWidth = options.nodeWidth ?? 220;
  const nodeHeight = options.nodeHeight ?? 96;
  const nodeHeights = options.nodeHeights;
  const nodeWidths = options.nodeWidths;

  const layout = computeLayout(tree, {
    nodeWidth,
    nodeHeight,
    nodeHeights,
    nodeWidths,
    ...(options.horizontalGap !== undefined && {
      horizontalGap: options.horizontalGap
    }),
    ...(options.verticalGap !== undefined && {
      verticalGap: options.verticalGap
    })
  });
  const subtreeW = layout.subtreeWidthById;

  const edges: CanvasEdge[] = [];

  const walk = (parent: TreeNodeModel<T>): void => {
    parent.children.forEach((child) => {
      edges.push({
        id: `${parent.id}-${child.id}`,
        source: parent.id,
        target: child.id
      });
      walk(child);
    });
  };

  walk(tree);

  if (layout.nodes.length === 0) {
    return { nodes: [], edges, contentBounds: EMPTY_BOUNDS };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const nodes: CanvasNode<T>[] = layout.nodes.map((node) => {
    const h = resolveHeight(node.id, nodeHeights, nodeHeight);
    const w = resolveNodeWidth(node.id, nodeWidths, nodeWidth);
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    if (subtreeW) {
      const span = subtreeW.get(node.id) ?? w;
      minX = Math.min(minX, node.x - span / 2);
      maxX = Math.max(maxX, node.x + span / 2);
    } else {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
    }
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + h);
    return {
      id: node.id,
      position: { x, y },
      data: { ...node.data, depth: node.depth } as T & { depth: number }
    };
  });

  return {
    nodes,
    edges,
    contentBounds: { minX, minY, maxX, maxY }
  };
}
