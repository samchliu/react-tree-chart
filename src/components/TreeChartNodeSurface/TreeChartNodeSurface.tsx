import clsx from "clsx";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { bindNodeDragAndDrop } from "../../core/dnd/pdndBridge";
import {
  TreeChartNodeInteractionRegisterContext,
  useTreeChartNodeInteractionBinding
} from "../TreeChartNodeInteractionContext/TreeChartNodeInteractionContext";
import styles from "./TreeChartNodeSurface.module.css";

export type TreeChartNodeSurfaceProps = {
  id: string;
  children: ReactNode;
  onContentSize?: (size: { width: number; height: number }) => void;
  onDragStart: (sourceId: string) => void;
  onDragOverTarget: (
    sourceId: string,
    targetId: string,
    cursorXWithinTarget: number
  ) => void;
  onDrop: (
    sourceId: string,
    targetId: string,
    cursorXWithinTarget: number
  ) => void;
};

function readSurfaceContentSize(el: HTMLElement): {
  width: number;
  height: number;
} | null {
  const w = Math.ceil(el.offsetWidth);
  const h = Math.ceil(el.offsetHeight);
  if (h > 0 && w > 0) {
    return { width: w, height: h };
  }
  return null;
}

export function TreeChartNodeSurface({
  id,
  children,
  onContentSize,
  onDragStart,
  onDragOverTarget,
  onDrop
}: TreeChartNodeSurfaceProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { interactionRef, registerInteraction, interactionEpoch } =
    useTreeChartNodeInteractionBinding();

  useLayoutEffect(() => {
    if (!onContentSize || !ref.current) {
      return;
    }
    const el = ref.current;
    const reportFromEntry = (entry: ResizeObserverEntry) => {
      const borderBox = entry.borderBoxSize?.[0];
      const h = Math.ceil(
        borderBox != null ? borderBox.blockSize : entry.contentRect.height
      );
      const w = Math.ceil(
        borderBox != null ? borderBox.inlineSize : entry.contentRect.width
      );
      if (h > 0 && w > 0) {
        onContentSize({ width: w, height: h });
      }
    };
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        reportFromEntry(entry);
      }
    });
    ro.observe(el);
    const initial = readSurfaceContentSize(el);
    if (initial) {
      onContentSize(initial);
    }
    return () => ro.disconnect();
  }, [onContentSize]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { draggable, droppable } = interactionRef.current;
    return bindNodeDragAndDrop(ref.current, id, {
      onDragStart,
      onDragOverTarget,
      onDrop,
      draggable,
      droppable
    });
  }, [
    id,
    interactionEpoch,
    onDragStart,
    onDragOverTarget,
    onDrop,
    interactionRef
  ]);

  return (
    <div
      ref={ref}
      className={clsx("tree-chart__nopan", "nopan", styles.dragSurface)}
    >
      <TreeChartNodeInteractionRegisterContext.Provider value={registerInteraction}>
        {children}
      </TreeChartNodeInteractionRegisterContext.Provider>
    </div>
  );
}
