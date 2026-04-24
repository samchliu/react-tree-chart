import { useTreeChartControllerContext } from "../components/TreeChartControllerContext/TreeChartControllerContext";
import type { TreeChartController } from "../components/TreeChart/treeChartController";

/**
 * Viewport helpers for the enclosing `TreeChart`. Must be used under `TreeChart`
 * (e.g. from a child via the `children` slot).
 */
export function useTreeChartController(): TreeChartController {
  return useTreeChartControllerContext();
}
