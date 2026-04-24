import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject
} from "react";

type TreeChartNodeInteractionState = {
  draggable: boolean;
  droppable: boolean;
};

const defaultInteraction: TreeChartNodeInteractionState = {
  draggable: true,
  droppable: true
};

export const TreeChartNodeInteractionRegisterContext = createContext<
  ((next: TreeChartNodeInteractionState) => void) | null
>(null);

/**
 * Registers per-node drag/drop behavior for `TreeChartNode` (custom `renderNode` content).
 * No-op when context is missing.
 */
export function useRegisterTreeChartNodeInteraction(
  draggable: boolean,
  droppable: boolean
): void {
  const register = useContext(TreeChartNodeInteractionRegisterContext);
  useLayoutEffect(() => {
    register?.({ draggable, droppable });
  }, [register, draggable, droppable]);
}

/** Internal: surface wrapper that owns DnD binding and provides register + epoch for re-bind. */
export function useTreeChartNodeInteractionBinding(): {
  interactionRef: MutableRefObject<TreeChartNodeInteractionState>;
  registerInteraction: (next: TreeChartNodeInteractionState) => void;
  interactionEpoch: number;
} {
  const interactionRef = useRef<TreeChartNodeInteractionState>(defaultInteraction);
  const [interactionEpoch, setInteractionEpoch] = useState(0);

  const registerInteraction = useCallback((next: TreeChartNodeInteractionState) => {
    const prev = interactionRef.current;
    interactionRef.current = next;
    if (
      prev.draggable !== next.draggable ||
      prev.droppable !== next.droppable
    ) {
      setInteractionEpoch((n) => n + 1);
    }
  }, []);

  return { interactionRef, registerInteraction, interactionEpoch };
}
