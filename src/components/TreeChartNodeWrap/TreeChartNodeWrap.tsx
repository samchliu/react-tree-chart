import clsx from "clsx";
import {
  cloneElement,
  isValidElement,
  useCallback,
  type ReactElement,
  type ReactNode
} from "react";
import styles from "./TreeChartNodeWrap.module.css";

export type TreeChartNodeWrapProps = {
  node: { id: string; position: { x: number; y: number } };
  nodeWidth: number;
  nodeHeight: number;
  dynamicHeight: boolean;
  dynamicWidth: boolean;
  measuredWidth: number | undefined;
  /** Hide node until dynamic width/height measurements cover the full visible tree. */
  dynamicLayoutRevealPending: boolean;
  onContentSize: (id: string, size: { width: number; height: number }) => void;
  children: ReactNode;
};

export function TreeChartNodeWrap({
  node,
  nodeWidth,
  nodeHeight,
  dynamicHeight,
  dynamicWidth,
  measuredWidth,
  dynamicLayoutRevealPending,
  onContentSize,
  children
}: TreeChartNodeWrapProps) {
  const reportContentSize = useCallback(
    (size: { width: number; height: number }) => {
      onContentSize(node.id, size);
    },
    [node.id, onContentSize]
  );

  const widthStyle =
    dynamicWidth === true
      ? { width: (measuredWidth ?? ("auto" as const)) as number | "auto" }
      : { width: nodeWidth };

  const heightStyle =
    dynamicHeight === true
      ? { height: "auto" as const }
      : { height: nodeHeight };

  const measureContent = dynamicHeight || dynamicWidth;
  const child =
    isValidElement(children) && measureContent
      ? cloneElement(
          children as ReactElement<{
            onContentSize?: (size: { width: number; height: number }) => void;
          }>,
          { onContentSize: reportContentSize }
        )
      : children;

  return (
    <div
      className={clsx(
        styles.nodeWrap,
        /* Width-only: keep flex so `dragSurface` stretches to `nodeHeight` (see `TreeChartNode` height:100%). */
        dynamicHeight && styles.nodeWrapDynamic
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        ...widthStyle,
        ...heightStyle,
        ...(dynamicLayoutRevealPending
          ? { opacity: 0, pointerEvents: "none" as const }
          : {})
      }}
    >
      {child}
    </div>
  );
}
