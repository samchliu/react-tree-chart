import clsx from "clsx";
import { useCallback, type ReactNode } from "react";
import { useRegisterTreeChartNodeInteraction } from "../TreeChartNodeInteractionContext/TreeChartNodeInteractionContext";
import { TreeChartDropZoneOverlay } from "../TreeChartNodeKit";
import type { TreeChartRenderNodeProps } from "../../types/tree";
import styles from "./TreeChartNode.module.css";

export type TreeChartNodeProps<T> = TreeChartRenderNodeProps<T> & {
  children?: ReactNode;
};

export const TreeChartNode = <T,>(props: TreeChartNodeProps<T>) => {
  const {
    node,
    isDragging,
    intentMode,
    showDropZones,
    children,
    collapsed,
    onToggleCollapse,
    onToggleCollapseSubtree
  } = props;
  useRegisterTreeChartNodeInteraction(node.draggable ?? true, node.droppable ?? true);

  const handleToggleCollapse = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const onToggle = e.altKey ? onToggleCollapseSubtree : onToggleCollapse;
    onToggle?.();
  }, [onToggleCollapse, onToggleCollapseSubtree]);

  return (
    <>
      {intentMode === "sibling-before" && (
        <div className={styles.dropTargetBefore} />
      )}
      <div
        className={clsx(styles.node, {
          [styles.dropTargetChild]: intentMode === "child",
          [styles.forbidden]: intentMode === "forbidden",
          [styles.isDragSource]: isDragging
        })}
      >
        {showDropZones ? <TreeChartDropZoneOverlay /> : null}
        {children}
      </div>
      {node.children.length > 0 && (
        <button
          className={styles.collapseButton}
          type="button"
          onClick={handleToggleCollapse}
        >
          {collapsed ? "＋" : "－"}
        </button>
      )}
      {intentMode === "sibling-after" && (
        <div className={styles.dropTargetAfter} />
      )}
    </>
  );
};
