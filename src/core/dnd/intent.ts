import type { DropIntent } from "../../types/tree";
import { canMoveNode } from "../tree/moveNode";
import type { TreeNodeModel } from "../../types/tree";

type IntentInput = {
  tree: TreeNodeModel<unknown>;
  sourceId: string;
  targetId: string;
  cursorXWithinTarget: number;
  targetWidth: number;
};

export function detectDropIntent(input: IntentInput): DropIntent {
  const { tree, sourceId, targetId, cursorXWithinTarget, targetWidth } = input;
  if (!canMoveNode(tree, sourceId, targetId)) {
    return { mode: "forbidden", sourceId, targetId };
  }

  const leftGap = targetWidth * 0.2;
  const rightGap = targetWidth * 0.8;

  if (cursorXWithinTarget >= leftGap && cursorXWithinTarget <= rightGap) {
    return { mode: "child", sourceId, targetId };
  }

  const isAfter = cursorXWithinTarget > targetWidth / 2;
  return {
    mode: isAfter ? "sibling-after" : "sibling-before",
    sourceId,
    targetId,
    siblingAfterId: isAfter ? targetId : undefined
  };
}
