import type { TreeChartViewportHandle } from "../TreeChartViewport/TreeChartViewport";

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type FitViewOptions = {
  padding?: number;
  duration?: number;
};

type CollapseHandlers = {
  collapseAll: () => void;
  expandAll: () => void;
};

export type TreeChartController = {
  fitView: (options?: FitViewOptions) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getViewport: () => Viewport;
  setViewport: (viewport: Viewport, options?: { duration?: number }) => void;
  collapseAll: () => void;
  expandAll: () => void;
};

export function createTreeChartController(
  getViewport: () => TreeChartViewportHandle | null,
  getCollapseHandlers: () => CollapseHandlers | null
): TreeChartController {
  return {
    fitView: (options?: FitViewOptions) => {
      getViewport()?.fitView({
        padding: options?.padding ?? 0.2,
        duration: options?.duration
      });
    },
    zoomIn: () => {
      getViewport()?.zoomIn();
    },
    zoomOut: () => {
      getViewport()?.zoomOut();
    },
    getViewport: () => getViewport()?.getViewport() ?? { x: 0, y: 0, zoom: 1 },
    setViewport: (viewport, options) => {
      getViewport()?.setViewport(viewport, options);
    },
    collapseAll: () => {
      getCollapseHandlers()?.collapseAll();
    },
    expandAll: () => {
      getCollapseHandlers()?.expandAll();
    }
  };
}
