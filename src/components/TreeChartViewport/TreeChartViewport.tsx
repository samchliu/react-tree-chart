import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { getTreeEdgePath } from "../../core/canvas/getTreeEdgePath";
import type { CanvasEdge } from "../../adapters/canvas/mapTreeToCanvas";
import { resolveNodeWidth } from "../../core/layout/computeLayout";
import type { Viewport } from "../TreeChart/treeChartController";
import styles from "./TreeChartViewport.module.css";

const ZOOM_IN_FACTOR = 1.2;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
const WHEEL_ZOOM_SENSITIVITY = 0.001;

type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type TreeChartViewportHandle = {
  fitView: (options?: { padding?: number; duration?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getViewport: () => Viewport;
  setViewport: (viewport: Viewport, options?: { duration?: number }) => void;
};

type TreeChartViewportProps = {
  contentBounds: ContentBounds;
  nodeWidth: number;
  nodeHeight: number;
  /** Per-node pixel heights for edge anchors; missing ids use `nodeHeight`. */
  nodeHeights?: ReadonlyMap<string, number>;
  /** Per-node pixel widths for horizontal edge anchors; missing ids use `nodeWidth`. */
  nodeWidths?: ReadonlyMap<string, number>;
  edges: CanvasEdge[];
  /** Node positions for drawing edges (ids must match edge source/target). */
  layoutNodes: { id: string; position: { x: number; y: number } }[];
  minZoom?: number;
  maxZoom?: number;
  zoomOnScroll: boolean;
  zoomOnPinch: boolean;
  zoomOnDoubleClick: boolean;
  panOnScroll: boolean;
  panOnDrag: boolean;
  autoFitViewOnTreeChange: boolean;
  /**
   * When false, auto-fit on content bounds / pane resize is skipped so viewport does not
   * zoom to fallback layout while dynamic width/height measurements are pending.
   */
  layoutMeasurementSettled?: boolean;
  /** When false, edge SVG is omitted while dynamic layout is settling. */
  showEdges?: boolean;
  /** Positioned node shells rendered inside the scaled transform layer (below `overlay`). */
  nodeElements: ReactNode;
  /** Floating UI (e.g. toolbar) — same role as children inside the old React Flow root. */
  overlay?: ReactNode;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function resolveNodeHeight(
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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function isNoPanTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  let el: Element | null = target;
  while (el) {
    const c = el.className;
    const s = typeof c === "string" ? c : "";
    if (
      s.includes("tree-chart__nopan") ||
      s.includes("nopan") ||
      s.includes("nodrag") ||
      s.includes("tree-chart__nodrag")
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function computeFitViewport(
  bounds: ContentBounds,
  containerW: number,
  containerH: number,
  padding: number,
  minZ: number,
  maxZ: number
): Viewport {
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  if (bw <= 0 || bh <= 0 || containerW <= 0 || containerH <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }
  const paddedMinX = bounds.minX - bw * padding;
  const paddedMinY = bounds.minY - bh * padding;
  const paddedMaxX = bounds.maxX + bw * padding;
  const paddedMaxY = bounds.maxY + bh * padding;
  const pw = paddedMaxX - paddedMinX;
  const ph = paddedMaxY - paddedMinY;
  let zoom = Math.min(containerW / pw, containerH / ph);
  zoom = clamp(zoom, minZ, maxZ);
  const x = (containerW - pw * zoom) / 2 - paddedMinX * zoom;
  const y = (containerH - ph * zoom) / 2 - paddedMinY * zoom;
  return { x, y, zoom };
}

export const TreeChartViewport = forwardRef<
  TreeChartViewportHandle,
  TreeChartViewportProps
>(function TreeChartViewport(
  {
    contentBounds,
    nodeWidth,
    nodeHeight,
    nodeHeights,
    nodeWidths,
    edges,
    layoutNodes,
    minZoom = 0.2,
    maxZoom = 2,
    zoomOnScroll,
    zoomOnPinch,
    zoomOnDoubleClick,
    panOnScroll,
    panOnDrag,
    autoFitViewOnTreeChange,
    layoutMeasurementSettled = true,
    showEdges = true,
    nodeElements,
    overlay
  },
  ref
) {
  const nodeById = useMemo(() => {
    const m = new Map<string, { position: { x: number; y: number } }>();
    for (const n of layoutNodes) {
      m.set(n.id, { position: n.position });
    }
    return m;
  }, [layoutNodes]);

  const paneRef = useRef<HTMLDivElement | null>(null);
  const isInitialMountRef = useRef(true);
  const autoFitViewOnTreeChangeRef = useRef(autoFitViewOnTreeChange);
  autoFitViewOnTreeChangeRef.current = autoFitViewOnTreeChange;
  const contentBoundsRef = useRef(contentBounds);
  contentBoundsRef.current = contentBounds;
  const layoutMeasurementSettledRef = useRef(layoutMeasurementSettled);
  layoutMeasurementSettledRef.current = layoutMeasurementSettled;
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const animRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    viewport: Viewport;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    vx: number;
    vy: number;
    zoom: number;
  } | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target: Viewport, durationMs: number) => {
      cancelAnimation();
      const from = viewportRef.current;
      if (durationMs <= 0) {
        setViewport(target);
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / durationMs);
        const e = easeInOutCubic(t);
        setViewport({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          zoom: from.zoom + (target.zoom - from.zoom) * e
        });
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation]
  );

  const fitViewInternal = useCallback(
    (options?: { padding?: number; duration?: number }) => {
      const el = paneRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const padding = options?.padding ?? 0.2;
      const next = computeFitViewport(
        contentBounds,
        rect.width,
        rect.height,
        padding,
        minZoom,
        maxZoom
      );
      animateTo(next, options?.duration ?? 0);
    },
    [animateTo, contentBounds, maxZoom, minZoom]
  );

  const zoomAtScreenPoint = useCallback(
    (screenX: number, screenY: number, factor: number) => {
      const el = paneRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = screenX - rect.left;
      const cy = screenY - rect.top;
      const prev = viewportRef.current;
      const worldX = (cx - prev.x) / prev.zoom;
      const worldY = (cy - prev.y) / prev.zoom;
      const newZoom = clamp(prev.zoom * factor, minZoom, maxZoom);
      setViewport({
        zoom: newZoom,
        x: cx - worldX * newZoom,
        y: cy - worldY * newZoom
      });
    },
    [maxZoom, minZoom]
  );

  const zoomIn = useCallback(() => {
    const el = paneRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    zoomAtScreenPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      ZOOM_IN_FACTOR
    );
  }, [zoomAtScreenPoint]);

  const zoomOut = useCallback(() => {
    const el = paneRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    zoomAtScreenPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      ZOOM_OUT_FACTOR
    );
  }, [zoomAtScreenPoint]);

  useImperativeHandle(
    ref,
    () => ({
      fitView: (options) => fitViewInternal(options),
      zoomIn,
      zoomOut,
      getViewport: () => viewportRef.current,
      setViewport: (v, options) => animateTo(v, options?.duration ?? 0)
    }),
    [animateTo, fitViewInternal, zoomIn, zoomOut]
  );

  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) {
      return;
    }
    if (!layoutMeasurementSettledRef.current) {
      return;
    }
    const isInitial = isInitialMountRef.current;
    isInitialMountRef.current = false;
    if (!isInitial && !autoFitViewOnTreeChangeRef.current) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const b = contentBoundsRef.current;
    const next = computeFitViewport(
      b,
      rect.width,
      rect.height,
      0.2,
      minZoom,
      maxZoom
    );
    setViewport(next);
  }, [
    contentBounds.minX,
    contentBounds.minY,
    contentBounds.maxX,
    contentBounds.maxY,
    layoutMeasurementSettled,
    minZoom,
    maxZoom
  ]);

  useEffect(() => {
    const el = paneRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => {
      if (!layoutMeasurementSettledRef.current) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const b = contentBoundsRef.current;
      const next = computeFitViewport(
        b,
        rect.width,
        rect.height,
        0.2,
        minZoom,
        maxZoom
      );
      setViewport(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minZoom, maxZoom]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (panOnScroll) {
        e.preventDefault();
        const prev = viewportRef.current;
        setViewport({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
          zoom: prev.zoom
        });
        return;
      }
      if (zoomOnScroll) {
        e.preventDefault();
        const delta = -e.deltaY * WHEEL_ZOOM_SENSITIVITY;
        const factor = Math.exp(delta);
        zoomAtScreenPoint(e.clientX, e.clientY, factor);
      }
    },
    [panOnScroll, zoomAtScreenPoint, zoomOnScroll]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!panOnDrag || e.button !== 0) {
        return;
      }
      if (isNoPanTarget(e.target)) {
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        vx: viewportRef.current.x,
        vy: viewportRef.current.y,
        zoom: viewportRef.current.zoom
      };
      setIsPanning(true);
    },
    [panOnDrag]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = panStartRef.current;
    if (!start) {
      return;
    }
    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;
    setViewport({
      x: start.vx + dx,
      y: start.vy + dy,
      zoom: start.zoom
    });
  }, []);

  const endPan = useCallback((e: React.PointerEvent) => {
    if (panStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      panStartRef.current = null;
      setIsPanning(false);
    }
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomOnDoubleClick || isNoPanTarget(e.target)) {
        return;
      }
      e.preventDefault();
      zoomAtScreenPoint(e.clientX, e.clientY, ZOOM_IN_FACTOR);
    },
    [zoomAtScreenPoint, zoomOnDoubleClick]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!zoomOnPinch || e.touches.length !== 2) {
        return;
      }
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const distance = Math.hypot(dx, dy);
      const centerX = (t0.clientX + t1.clientX) / 2;
      const centerY = (t0.clientY + t1.clientY) / 2;
      pinchStartRef.current = {
        distance,
        viewport: { ...viewportRef.current },
        centerX,
        centerY
      };
    },
    [zoomOnPinch]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const start = pinchStartRef.current;
      if (!start || e.touches.length !== 2) {
        return;
      }
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const distance = Math.hypot(dx, dy);
      const scale = distance / start.distance;
      const el = paneRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = start.centerX - rect.left;
      const cy = start.centerY - rect.top;
      const v0 = start.viewport;
      const worldX = (cx - v0.x) / v0.zoom;
      const worldY = (cy - v0.y) / v0.zoom;
      const newZoom = clamp(v0.zoom * scale, minZoom, maxZoom);
      setViewport({
        zoom: newZoom,
        x: cx - worldX * newZoom,
        y: cy - worldY * newZoom
      });
    },
    [maxZoom, minZoom]
  );

  const onTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
  }, []);

  const transformStyle: React.CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
  };

  const edgesSvg = (
    <svg
      className={styles.edgesSvg}
      width={Math.max(contentBounds.maxX - contentBounds.minX, 0)}
      height={Math.max(contentBounds.maxY - contentBounds.minY, 0)}
      style={{
        transform: `translate(${contentBounds.minX}px, ${contentBounds.minY}px)`
      }}
    >
      {edges.map((edge) => {
        const s = nodeById.get(edge.source);
        const t = nodeById.get(edge.target);
        if (!s || !t) {
          return null;
        }
        const hSource = resolveNodeHeight(edge.source, nodeHeights, nodeHeight);
        const wSource = resolveNodeWidth(edge.source, nodeWidths, nodeWidth);
        const wTarget = resolveNodeWidth(edge.target, nodeWidths, nodeWidth);
        const sx = s.position.x + wSource / 2 - contentBounds.minX;
        const sy = s.position.y + hSource - contentBounds.minY;
        const tx = t.position.x + wTarget / 2 - contentBounds.minX;
        const ty = t.position.y - contentBounds.minY;
        const d = getTreeEdgePath(sx, sy, tx, ty);
        return <path key={edge.id} className={styles.edgePath} d={d} />;
      })}
    </svg>
  );

  return (
    <div
      ref={paneRef}
      className={clsx(
        "tree-chart__pane",
        styles.pane,
        isPanning && styles.panePanning
      )}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={onDoubleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={clsx("tree-chart__pane", styles.transformLayer)}
        style={transformStyle}
      >
        {showEdges ? edgesSvg : null}
        <div className={styles.nodeLayer}>{nodeElements}</div>
      </div>
      {overlay ? <div className={styles.overlay}>{overlay}</div> : null}
    </div>
  );
});
