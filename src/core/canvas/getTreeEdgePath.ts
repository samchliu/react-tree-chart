/**
 * Orthogonal path from parent bottom to child top (tree layout).
 * When x aligns, returns a straight segment; otherwise an H/V elbow via mid-Y.
 *
 * The horizontal segment is biased **toward the child** (not the vertical midpoint)
 * so it does not sit in the vertical band of tall same-depth siblings on variable-height trees.
 */
export function getTreeEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  if (Math.abs(sourceX - targetX) < 0.5) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
  const span = targetY - sourceY;
  const midAverage = (sourceY + targetY) / 2;
  /** Pull the elbow down when parent–child span is tall (uncles may occupy the upper band). */
  const hug = Math.min(120, Math.max(18, span * 0.42));
  let midY = Math.max(midAverage, targetY - hug);
  midY = Math.max(sourceY + 2, Math.min(targetY - 2, midY));
  return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
}
