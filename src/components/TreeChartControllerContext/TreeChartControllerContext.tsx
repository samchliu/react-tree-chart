import { createContext, useContext, type ReactNode } from "react";
import type { TreeChartController } from "../TreeChart/treeChartController";

const TreeChartControllerContext = createContext<TreeChartController | null>(
  null
);

export function TreeChartControllerProvider({
  value,
  children
}: {
  value: TreeChartController;
  children: ReactNode;
}) {
  return (
    <TreeChartControllerContext.Provider value={value}>
      {children}
    </TreeChartControllerContext.Provider>
  );
}

export function useTreeChartControllerContext(): TreeChartController {
  const v = useContext(TreeChartControllerContext);
  if (!v) {
    throw new Error("useTreeChartController must be used within TreeChart");
  }
  return v;
}
