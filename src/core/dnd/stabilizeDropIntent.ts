import type { DropIntent } from "../../types/tree";

export type PendingTargetSwitch = {
  targetId: string;
  mode: DropIntent["mode"];
  siblingAfterId?: string;
  hits: number;
};

/**
 * Reduces cursor jitter when resolving drop intent: hysteresis near zone edges
 * and a short debounce when switching targets.
 */
export function stabilizeDropIntent(args: {
  prevIntent: DropIntent | undefined;
  nextIntent: DropIntent;
  cursorRatio: number;
  pending: PendingTargetSwitch | null;
}): { intent: DropIntent; pending: PendingTargetSwitch | null } {
  const { prevIntent, nextIntent, cursorRatio, pending } = args;

  let stabilizedIntent = nextIntent;

  const sameSourceAndTarget =
    prevIntent?.sourceId === nextIntent.sourceId &&
    prevIntent?.targetId === nextIntent.targetId;

  if (
    sameSourceAndTarget &&
    prevIntent &&
    prevIntent.mode !== "forbidden" &&
    nextIntent.mode !== "forbidden"
  ) {
    const leftEnterSibling = 0.15;
    const leftLeaveSibling = 0.25;
    const rightEnterSibling = 0.85;
    const rightLeaveSibling = 0.75;

    const prevWasLeftSibling = prevIntent.mode === "sibling-before";
    const prevWasRightSibling = prevIntent.mode === "sibling-after";

    if (
      prevIntent.mode === "child" &&
      (nextIntent.mode === "sibling-before" ||
        nextIntent.mode === "sibling-after")
    ) {
      const shouldKeepChild =
        cursorRatio >= leftEnterSibling && cursorRatio <= rightEnterSibling;
      if (shouldKeepChild) {
        stabilizedIntent = prevIntent;
      }
    } else if (
      prevWasLeftSibling &&
      nextIntent.mode === "child" &&
      cursorRatio < leftLeaveSibling
    ) {
      stabilizedIntent = prevIntent;
    } else if (
      prevWasRightSibling &&
      nextIntent.mode === "child" &&
      cursorRatio > rightLeaveSibling
    ) {
      stabilizedIntent = prevIntent;
    }
  }

  let nextPending: PendingTargetSwitch | null = pending;

  const changedTarget =
    !!prevIntent &&
    (prevIntent.targetId !== stabilizedIntent.targetId ||
      prevIntent.sourceId !== stabilizedIntent.sourceId);

  if (changedTarget) {
    const candidate = pending;
    const sameCandidate =
      candidate &&
      candidate.targetId === stabilizedIntent.targetId &&
      candidate.mode === stabilizedIntent.mode &&
      candidate.siblingAfterId === stabilizedIntent.siblingAfterId;

    if (sameCandidate) {
      const hits = candidate.hits + 1;
      nextPending = {
        ...candidate,
        hits
      };
      if (hits < 2) {
        stabilizedIntent = prevIntent;
      }
    } else {
      nextPending = {
        targetId: stabilizedIntent.targetId,
        mode: stabilizedIntent.mode,
        siblingAfterId: stabilizedIntent.siblingAfterId,
        hits: 1
      };
      stabilizedIntent = prevIntent;
    }
  } else {
    nextPending = null;
  }

  const isSameIntent =
    prevIntent?.mode === stabilizedIntent.mode &&
    prevIntent?.sourceId === stabilizedIntent.sourceId &&
    prevIntent?.targetId === stabilizedIntent.targetId &&
    prevIntent?.siblingAfterId === stabilizedIntent.siblingAfterId;

  return {
    intent: isSameIntent && prevIntent ? prevIntent : stabilizedIntent,
    pending: nextPending
  };
}
