import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes
} from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  mapTreeToCanvas,
  type CanvasNode
} from "../../adapters/canvas/mapTreeToCanvas";
import { detectDropIntent } from "../../core/dnd/intent";
import {
  stabilizeDropIntent,
  type PendingTargetSwitch
} from "../../core/dnd/stabilizeDropIntent";
import { getElementClassName } from "../../core/dnd/pdndBridge";
import { resolveNodeWidth } from "../../core/layout/computeLayout";
import {
  collectNodeIds,
  collectSubtreeParentIds,
  pruneCollapsedForLayout
} from "../../core/tree/pruneCollapsed";
import { indexTreeById, moveNode } from "../../core/tree/moveNode";
import {
  type DropIntent,
  type TreeChartDragOverEvent,
  type TreeChartDragStartEvent,
  type TreeChartDropEvent,
  type TreeChartProps,
  type TreeChartRenderNodeProps,
  type TreeNodeData,
  type TreeNodeModel
} from "../../types/tree";
import { TreeChartNode } from "../TreeChartNode/TreeChartNode";
import { TreeChartNodeSurface } from "../TreeChartNodeSurface/TreeChartNodeSurface";
import { TreeChartNodeWrap } from "../TreeChartNodeWrap/TreeChartNodeWrap";
import { TreeChartControllerProvider } from "../TreeChartControllerContext/TreeChartControllerContext";
import {
  createTreeChartController,
  type TreeChartController
} from "./treeChartController";
import {
  TreeChartViewport,
  type TreeChartViewportHandle
} from "../TreeChartViewport/TreeChartViewport";
import styles from "./TreeChart.module.css";

type TreeNodeViewData = {
  depth: number;
  intentMode?: DropIntent["mode"];
  showDropZones?: boolean;
  hasChildren?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleCollapseSubtree?: () => void;
};

function mergeCanvasNodeViewData<T>(
  node: CanvasNode<T>,
  ctx: {
    intent: DropIntent | undefined;
    showDropZones: boolean;
    collapsedIds: Set<string>;
    toggleCollapse: (id: string) => void;
    toggleCollapseSubtree: (id: string) => void;
    modelById: Map<string, TreeNodeModel<T>>;
  }
): CanvasNode<T> {
  const {
    intent,
    showDropZones,
    collapsedIds,
    toggleCollapse,
    toggleCollapseSubtree,
    modelById
  } = ctx;

  const intentMode = intent?.targetId === node.id ? intent.mode : undefined;
  const modelNode = modelById.get(node.id);
  const hasChildren = (modelNode?.children.length ?? 0) > 0;
  const collapsed = collapsedIds.has(node.id);
  const onToggleCollapse = hasChildren
    ? () => toggleCollapse(node.id)
    : undefined;
  const onToggleCollapseSubtree = hasChildren
    ? () => toggleCollapseSubtree(node.id)
    : undefined;

  const viewData: TreeNodeViewData = {
    depth: node.data.depth,
    intentMode,
    showDropZones,
    hasChildren,
    collapsed,
    onToggleCollapse,
    onToggleCollapseSubtree
  };

  return { ...node, data: viewData } as unknown as CanvasNode<T>;
}

function TreeChartRender<T>(
  {
    tree,
    onTreeChange,
    onDragStart,
    onDragOver,
    onDrop,
    renderNode,
    showDropZones = false,
    nodeWidth,
    nodeHeight,
    gap,
    gapX,
    gapY,
    className,
    initialCollapsedIds,
    children,
    zoomOnScroll = true,
    zoomOnPinch = true,
    zoomOnDoubleClick = false,
    panOnScroll = false,
    panOnDrag = true,
    autoFitViewOnTreeChange = false
  }: TreeChartProps<T>,
  ref: ForwardedRef<TreeChartController>
): ReactElement | null {
  const isDynamicWidth = nodeWidth === "auto";
  const isDynamicHeight = nodeHeight === "auto";
  const numericNodeWidth = typeof nodeWidth === "number" ? nodeWidth : 220;
  const numericNodeHeight = typeof nodeHeight === "number" ? nodeHeight : 96;

  const viewportRef = useRef<TreeChartViewportHandle | null>(null);
  const collapseHandlersRef = useRef<{
    collapseAll: () => void;
    expandAll: () => void;
  } | null>(null);
  const [localTree, setLocalTree] = useState<TreeNodeModel<T>>(tree);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(initialCollapsedIds ?? [])
  );
  const [intent, setIntent] = useState<DropIntent | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const pendingTargetSwitchRef = useRef<PendingTargetSwitch | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(
    () => new Map()
  );
  const [measuredWidths, setMeasuredWidths] = useState<Map<string, number>>(
    () => new Map()
  );

  collapseHandlersRef.current = {
    collapseAll: () => setCollapsedIds(collectSubtreeParentIds(localTree)),
    expandAll: () => setCollapsedIds(new Set())
  };

  const controller = useMemo(
    () =>
      createTreeChartController(
        () => viewportRef.current,
        () => collapseHandlersRef.current
      ),
    []
  );

  useImperativeHandle(ref, () => controller, [controller]);

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  useEffect(() => {
    setCollapsedIds((prev) => {
      const valid = collectNodeIds(localTree);
      const next = new Set<string>();
      let changed = false;
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [localTree]);

  const layoutTree = useMemo(
    () => pruneCollapsedForLayout(localTree, collapsedIds),
    [localTree, collapsedIds]
  );

  useEffect(() => {
    if (!isDynamicHeight) {
      setMeasuredHeights((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    const valid = collectNodeIds(layoutTree);
    setMeasuredHeights((prev) => {
      let changed = false;
      const next = new Map<string, number>();
      for (const [id, h] of prev) {
        if (valid.has(id)) {
          next.set(id, h);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) {
        return prev;
      }
      return next;
    });
  }, [isDynamicHeight, layoutTree]);

  useEffect(() => {
    if (!isDynamicWidth) {
      setMeasuredWidths((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    const valid = collectNodeIds(layoutTree);
    setMeasuredWidths((prev) => {
      let changed = false;
      const next = new Map<string, number>();
      for (const [id, w] of prev) {
        if (valid.has(id)) {
          next.set(id, w);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) {
        return prev;
      }
      return next;
    });
  }, [isDynamicWidth, layoutTree]);

  const dynamicWidthLayoutSettled = useMemo(() => {
    if (!isDynamicWidth) {
      return true;
    }
    const ids = collectNodeIds(layoutTree);
    if (ids.size === 0) {
      return true;
    }
    for (const id of ids) {
      const w = measuredWidths.get(id);
      if (w == null || !Number.isFinite(w) || w <= 0) {
        return false;
      }
    }
    return true;
  }, [isDynamicWidth, layoutTree, measuredWidths]);

  const dynamicHeightLayoutSettled = useMemo(() => {
    if (!isDynamicHeight) {
      return true;
    }
    const ids = collectNodeIds(layoutTree);
    if (ids.size === 0) {
      return true;
    }
    for (const id of ids) {
      const h = measuredHeights.get(id);
      if (h == null || !Number.isFinite(h) || h <= 0) {
        return false;
      }
    }
    return true;
  }, [isDynamicHeight, layoutTree, measuredHeights]);

  const dynamicContentLayoutSettled = useMemo(
    () => dynamicWidthLayoutSettled && dynamicHeightLayoutSettled,
    [dynamicWidthLayoutSettled, dynamicHeightLayoutSettled]
  );

  const nodeHeightsOption = isDynamicHeight ? measuredHeights : undefined;
  const nodeWidthsOption = isDynamicWidth ? measuredWidths : undefined;

  const horizontalGap = gapX ?? gap;
  const verticalGap = gapY ?? gap;

  const { nodes, edges, contentBounds } = useMemo(
    () =>
      mapTreeToCanvas(layoutTree, {
        nodeWidth: numericNodeWidth,
        nodeHeight: numericNodeHeight,
        nodeHeights: nodeHeightsOption,
        nodeWidths: nodeWidthsOption,
        horizontalGap,
        verticalGap
      }),
    [
      layoutTree,
      numericNodeWidth,
      numericNodeHeight,
      nodeHeightsOption,
      nodeWidthsOption,
      horizontalGap,
      verticalGap
    ]
  );

  const onNodeContentSize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      if (isDynamicHeight) {
        setMeasuredHeights((prev) => {
          if (prev.get(id) === size.height) {
            return prev;
          }
          const next = new Map(prev);
          next.set(id, size.height);
          return next;
        });
      }
      if (isDynamicWidth) {
        setMeasuredWidths((prev) => {
          if (prev.get(id) === size.width) {
            return prev;
          }
          const next = new Map(prev);
          next.set(id, size.width);
          return next;
        });
      }
    },
    [isDynamicHeight, isDynamicWidth]
  );

  const modelById = useMemo(() => indexTreeById(localTree), [localTree]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const toggleCollapseSubtree = useCallback(
    (nodeId: string) => {
      const root = modelById.get(nodeId);
      if (!root) return;
      const subtreeParentIds = collectSubtreeParentIds(root);
      setCollapsedIds((prev) => {
        const allCollapsed = [...subtreeParentIds].every((id) => prev.has(id));
        const next = new Set(prev);
        if (allCollapsed) {
          subtreeParentIds.forEach((id) => next.delete(id));
        } else {
          subtreeParentIds.forEach((id) => next.add(id));
        }
        return next;
      });
    },
    [modelById]
  );

  const nodesWithIntent = useMemo((): CanvasNode<T>[] => {
    return nodes.map((node) =>
      mergeCanvasNodeViewData<T>(node, {
        intent,
        showDropZones: showDropZones && dragActive,
        collapsedIds,
        toggleCollapse,
        toggleCollapseSubtree,
        modelById
      })
    );
  }, [
    nodes,
    intent,
    showDropZones,
    dragActive,
    collapsedIds,
    toggleCollapse,
    toggleCollapseSubtree,
    modelById
  ]);

  const handleDragStart = useCallback(
    (sourceId: string) => {
      setDraggingSourceId(sourceId);
      pendingTargetSwitchRef.current = null;
      setIntent(undefined);

      if (onDragStart) {
        const sourceNode = modelById.get(sourceId);
        if (sourceNode) {
          onDragStart({
            sourceNode
          } satisfies TreeChartDragStartEvent<T>);
        }
      }
    },
    [modelById, onDragStart]
  );

  const handleDragOverTarget = useCallback(
    (sourceId: string, targetId: string, cursorXWithinTarget: number) => {
      const targetW = resolveNodeWidth(
        targetId,
        nodeWidthsOption,
        numericNodeWidth
      );
      const nextIntent = detectDropIntent({
        tree: localTree,
        sourceId,
        targetId,
        cursorXWithinTarget,
        targetWidth: targetW
      });
      const cursorRatio = cursorXWithinTarget / targetW;
      setIntent((prevIntent) => {
        const { intent: next, pending } = stabilizeDropIntent({
          prevIntent,
          nextIntent,
          cursorRatio,
          pending: pendingTargetSwitchRef.current
        });
        pendingTargetSwitchRef.current = pending;
        return next;
      });

      if (onDragOver && nextIntent.mode !== "forbidden") {
        const sourceNode = modelById.get(sourceId);
        const targetNode = modelById.get(targetId);
        if (sourceNode && targetNode) {
          onDragOver({
            sourceNode,
            targetNode,
            intent: nextIntent
          } satisfies TreeChartDragOverEvent<T>);
        }
      }
    },
    [localTree, modelById, numericNodeWidth, nodeWidthsOption, onDragOver]
  );

  const handleDrop = useCallback(
    (sourceId: string, targetId: string, cursorXWithinTarget: number) => {
      const targetW = resolveNodeWidth(
        targetId,
        nodeWidthsOption,
        numericNodeWidth
      );
      const nextIntent = detectDropIntent({
        tree: localTree,
        sourceId,
        targetId,
        cursorXWithinTarget,
        targetWidth: targetW
      });
      setIntent(undefined);
      if (nextIntent.mode === "forbidden") {
        return;
      }

      const sourceNode = modelById.get(sourceId);
      const targetNode = modelById.get(targetId);

      if (onDrop && sourceNode && targetNode) {
        const result = onDrop({
          sourceNode,
          targetNode,
          intent: nextIntent
        } satisfies TreeChartDropEvent<T>);
        if (result === false) return;
      }

      const next = moveNode({
        tree: localTree,
        sourceId,
        targetId,
        mode: nextIntent.mode === "child" ? "child" : "sibling",
        siblingAfterId:
          nextIntent.mode === "sibling-after" ? targetId : undefined
      });

      setLocalTree(next);
      onTreeChange?.({ tree: next });
    },
    [
      localTree,
      modelById,
      numericNodeWidth,
      nodeWidthsOption,
      onDrop,
      onTreeChange
    ]
  );

  useEffect(() => {
    const clearHoverIntent = () => {
      pendingTargetSwitchRef.current = null;
      setIntent((prev) => (prev === undefined ? prev : undefined));
    };

    return monitorForElements({
      canMonitor: ({ source }) => typeof source.data.nodeId === "string",
      onDragStart: () => {
        setDragActive(true);
      },
      onDrag: ({ location }) => {
        const pointerElement = document.elementFromPoint(
          location.current.input.clientX,
          location.current.input.clientY
        );
        const pointerClass = getElementClassName(pointerElement);
        if (!pointerClass.includes("tree-chart__pane")) {
          return;
        }
        clearHoverIntent();
      },
      onDropTargetChange: ({ location }) => {
        const overTreeNodeTarget = location.current.dropTargets.some(
          (t) => typeof t.data.nodeId === "string"
        );
        if (overTreeNodeTarget) {
          return;
        }
        clearHoverIntent();
      },
      onDrop: () => {
        setIntent(undefined);
        setDragActive(false);
        setDraggingSourceId(null);
      }
    });
  }, []);

  const nodeElements = useMemo(() => {
    const resolvedRenderNode: (
      props: TreeChartRenderNodeProps<T>
    ) => ReactNode =
      renderNode ??
      ((props) => {
        const p = props as TreeChartRenderNodeProps<TreeNodeData>;
        return <TreeChartNode {...p}>{p.node.data.label}</TreeChartNode>;
      });
    return nodesWithIntent.map((node) => {
      const viewData = node.data as TreeNodeViewData;
      const modelNode = modelById.get(node.id);
      const isDragging = dragActive && draggingSourceId === node.id;
      return (
        <TreeChartNodeWrap
          key={node.id}
          node={node}
          nodeWidth={numericNodeWidth}
          nodeHeight={numericNodeHeight}
          dynamicHeight={isDynamicHeight}
          dynamicWidth={isDynamicWidth}
          measuredWidth={measuredWidths.get(node.id)}
          dynamicLayoutRevealPending={!dynamicContentLayoutSettled}
          onContentSize={onNodeContentSize}
        >
          <TreeChartNodeSurface
            id={node.id}
            onDragStart={handleDragStart}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
          >
            {modelNode &&
              resolvedRenderNode({
                node: modelNode,
                depth: viewData.depth,
                isDragging,
                isDropTarget: viewData.intentMode !== undefined,
                intentMode: viewData.intentMode,
                showDropZones: viewData.showDropZones,
                hasChildren: viewData.hasChildren,
                collapsed: viewData.collapsed,
                onToggleCollapse: viewData.onToggleCollapse,
                onToggleCollapseSubtree: viewData.onToggleCollapseSubtree
              })}
          </TreeChartNodeSurface>
        </TreeChartNodeWrap>
      );
    });
  }, [
    nodesWithIntent,
    renderNode,
    modelById,
    dragActive,
    draggingSourceId,
    numericNodeWidth,
    numericNodeHeight,
    isDynamicHeight,
    isDynamicWidth,
    measuredWidths,
    dynamicContentLayoutSettled,
    onNodeContentSize,
    handleDragStart,
    handleDragOverTarget,
    handleDrop
  ]);

  return (
    <div className={clsx(styles.container, className)}>
      <TreeChartControllerProvider value={controller}>
        <TreeChartViewport
          ref={viewportRef}
          contentBounds={contentBounds}
          nodeWidth={numericNodeWidth}
          nodeHeight={numericNodeHeight}
          nodeHeights={nodeHeightsOption}
          nodeWidths={nodeWidthsOption}
          edges={edges}
          layoutNodes={nodes}
          minZoom={0.2}
          maxZoom={2}
          zoomOnScroll={zoomOnScroll ?? true}
          zoomOnPinch={zoomOnPinch ?? true}
          zoomOnDoubleClick={zoomOnDoubleClick ?? true}
          panOnScroll={panOnScroll ?? true}
          panOnDrag={panOnDrag ?? true}
          autoFitViewOnTreeChange={autoFitViewOnTreeChange}
          layoutMeasurementSettled={dynamicContentLayoutSettled}
          showEdges={dynamicContentLayoutSettled}
          nodeElements={nodeElements}
          overlay={children}
        />
      </TreeChartControllerProvider>
    </div>
  );
}

export const TreeChart = forwardRef(TreeChartRender) as <T>(
  props: TreeChartProps<T> & RefAttributes<TreeChartController>
) => ReactElement | null;
