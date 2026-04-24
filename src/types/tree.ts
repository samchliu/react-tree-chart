import type { ReactNode } from "react";

export type TreeNodeData = {
  label: string;
};

export type TreeNodeModel<T> = {
  id: string;
  data: T;
  children: TreeNodeModel<T>[];
  /** When false, this node cannot be dragged. Default true. */
  draggable?: boolean;
  /** When false, this node does not accept drops. Default true. */
  droppable?: boolean;
};

export type DropIntentMode =
  | "child"
  | "sibling-before"
  | "sibling-after"
  | "forbidden";

export type DropIntent = {
  mode: DropIntentMode;
  sourceId: string;
  targetId: string;
  siblingAfterId?: string;
};

/**
 * Props passed to `TreeChart`'s `renderNode`. Prefer wrapping content in `TreeChartNode`
 * (package export), which includes invisible anchor spacing compatible with layout edges.
 * When `TreeChart` uses `nodeHeight="auto"`, set `TreeChartNode`'s `contentOverflow="auto"` if content can wrap or grow.
 * With per-node or measured widths, avoid hard-coding a fixed card width in custom nodes so layout and edges stay aligned.
 */
export type TreeChartRenderNodeProps<T> = {
  node: TreeNodeModel<T>;
  depth: number;
  /** True while this node is the active drag source (library drag-and-drop). */
  isDragging?: boolean;
  /** True while this node is the current drop target under the cursor. */
  isDropTarget?: boolean;
  /** Drop intent when this node is the target (for styling, e.g. pass to `TreeChartNode`). */
  intentMode?: DropIntentMode;
  /** When true, show 20%/60%/20% drop zone guides (same as built-in default node). */
  showDropZones?: boolean;
  /** From the full tree: whether this node has any children. */
  hasChildren?: boolean;
  /** Whether this node's subtree is hidden for layout. */
  collapsed?: boolean;
  /** Toggle collapse for this node (no-op if no children). */
  onToggleCollapse?: () => void;
  /**
   * Recursively collapse or expand every node in this node's subtree.
   * If all collapsible nodes in the subtree are already collapsed, expands them all;
   * otherwise collapses them all. No-op if this node has no children.
   */
  onToggleCollapseSubtree?: () => void;
};

export type TreeChartChangeEvent<T> = {
  tree: TreeNodeModel<T>;
};

export type TreeChartDragStartEvent<T> = {
  sourceNode: TreeNodeModel<T>;
};

export type TreeChartDragOverEvent<T> = {
  sourceNode: TreeNodeModel<T>;
  targetNode: TreeNodeModel<T>;
  intent: DropIntent;
};

export type TreeChartDropEvent<T> = {
  sourceNode: TreeNodeModel<T>;
  targetNode: TreeNodeModel<T>;
  intent: DropIntent;
};

export type TreeChartProps<T> = {
  tree: TreeNodeModel<T>;
  onTreeChange?: (event: TreeChartChangeEvent<T>) => void;
  /** Fired when the user starts dragging a node. */
  onDragStart?: (event: TreeChartDragStartEvent<T>) => void;
  /**
   * Fired each time the drop intent changes while dragging over a target node.
   * May be called frequently; avoid heavy work inside this callback.
   */
  onDragOver?: (event: TreeChartDragOverEvent<T>) => void;
  /**
   * Fired when the user releases a node over a valid drop target, **before** the
   * tree is updated. Return `false` to cancel the drop.
   */
  onDrop?: (event: TreeChartDropEvent<T>) => boolean | void;
  renderNode?: (props: TreeChartRenderNodeProps<T>) => ReactNode;
  /**
   * Fixed pixel width for all nodes, or `'auto'` to measure each node's width from the DOM
   * and use it for layout, bounds, edges, and drop zones.
   * When `'auto'`, nodes are hidden until the first measurement pass completes.
   * Defaults to `220`.
   */
  nodeWidth?: number | "auto";
  /**
   * Fixed pixel height for all nodes, or `'auto'` to measure each node's height from the DOM
   * and use it for layout and bounds. When `'auto'`, set `TreeChartNode`'s
   * `contentOverflow="auto"` on custom cards if content can wrap or grow.
   * Nodes are hidden until the first measurement pass completes.
   * Defaults to `96`.
   */
  nodeHeight?: number | "auto";
  /**
   * Minimum distance between nodes on both axes. Overridden by `gapX` / `gapY`.
   * Defaults: 48 horizontal, 40 vertical.
   */
  gap?: number;
  /** Minimum horizontal distance between sibling subtrees. Defaults to `gap` if set, otherwise 48. */
  gapX?: number;
  /** Minimum vertical distance between a parent node and its children row. Defaults to `gap` if set, otherwise 40. */
  gapY?: number;

  /**
   * When true, show drop-zone guides on all nodes while dragging (same as the
   * built-in default node). When omitted, the guides appear automatically
   * during any drag interaction.
   */
  showDropZones?: boolean;
  /**
   * When true, the viewport re-fits whenever the tree layout changes (e.g. after
   * a node is reordered or collapsed). The initial mount always fits regardless of
   * this setting. Default `false`.
   */
  autoFitViewOnTreeChange?: boolean;
  className?: string;
  /** Node ids that start collapsed (uncontrolled; only used on first mount). */
  initialCollapsedIds?: string[];
  /** Rendered above the canvas (e.g. panels that call `useTreeChartController`). */
  children?: ReactNode;

  /** Viewport interaction options. */
  zoomOnScroll?: boolean;
  zoomOnPinch?: boolean;
  zoomOnDoubleClick?: boolean;
  panOnScroll?: boolean;
  panOnDrag?: boolean;
};
