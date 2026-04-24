import {
  draggable,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

/** Used by TreeChart drag monitor for pointer-vs-pane hit testing. */
export function getElementClassName(element: Element | null): string {
  if (!element) {
    return "";
  }
  if (element instanceof HTMLElement) {
    return typeof element.className === "string" ? element.className : "";
  }
  if (element instanceof SVGElement && element.className) {
    return typeof element.className === "string"
      ? element.className
      : element.className.baseVal;
  }
  return "";
}

/**
 * Map pointer X from viewport coordinates (after CSS transforms on ancestors) into the
 * drop target's local width, matching layout width used by `resolveNodeWidth` / `detectDropIntent`.
 */
export function clientXToTargetLocalX(
  clientX: number,
  rect: DOMRectReadOnly,
  targetEl: HTMLElement
): number {
  const logicalW = targetEl.offsetWidth;
  if (rect.width <= 0 || logicalW <= 0) {
    return 0;
  }
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return ratio * logicalW;
}

type DndCallbacks = {
  onDragStart?: (sourceId: string) => void;
  onDragOverTarget?: (
    sourceId: string,
    targetId: string,
    cursorXWithinTarget: number
  ) => void;
  onDrop?: (
    sourceId: string,
    targetId: string,
    cursorXWithinTarget: number
  ) => void;
};

export type BindNodeDragAndDropOptions = DndCallbacks & {
  /** When false, the node cannot be dragged as a drag source. Default true. */
  draggable?: boolean;
  /** When false, the node does not accept drops. Default true. */
  droppable?: boolean;
};

export function bindNodeDragAndDrop(
  element: HTMLElement,
  nodeId: string,
  options: BindNodeDragAndDropOptions
): () => void {
  const enableDrag = options.draggable !== false;
  const enableDrop = options.droppable !== false;
  const { onDragStart, onDragOverTarget, onDrop } = options;

  const cleanups: (() => void)[] = [];

  if (enableDrag) {
    cleanups.push(
      draggable({
        element,
        getInitialData: () => ({ nodeId }),
        onDragStart: () => {
          onDragStart?.(nodeId);
        }
      })
    );
  }

  if (enableDrop) {
    cleanups.push(
      dropTargetForElements({
        element,
        getData: () => ({ nodeId }),
        onDrag: ({ source, location }) => {
          const sourceId = String(source.data.nodeId);
          const currentDropTargets = location.current.dropTargets;
          const targetEl = currentDropTargets[0]?.element;
          if (!(targetEl instanceof HTMLElement)) {
            return;
          }
          const targetRect = targetEl.getBoundingClientRect();
          const pointerElement = document.elementFromPoint(
            location.current.input.clientX,
            location.current.input.clientY
          );
          const pointerClass = getElementClassName(pointerElement);
          const pointerOnPane = pointerClass.includes("tree-chart__pane");
          if (pointerOnPane) {
            return;
          }
          const cursorXWithinTarget = clientXToTargetLocalX(
            location.current.input.clientX,
            targetRect,
            targetEl
          );
          onDragOverTarget?.(sourceId, nodeId, cursorXWithinTarget);
        },
        onDrop: ({ source, location }) => {
          const sourceId = String(source.data.nodeId);
          const currentDropTargets = location.current.dropTargets;
          const targetEl = currentDropTargets[0]?.element;
          if (!(targetEl instanceof HTMLElement)) {
            return;
          }
          const targetRect = targetEl.getBoundingClientRect();
          const cursorXWithinTarget = clientXToTargetLocalX(
            location.current.input.clientX,
            targetRect,
            targetEl
          );
          onDrop?.(sourceId, nodeId, cursorXWithinTarget);
        }
      })
    );
  }

  return () => {
    for (let i = cleanups.length - 1; i >= 0; i -= 1) {
      cleanups[i]();
    }
  };
}
