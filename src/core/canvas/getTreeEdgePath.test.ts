import { describe, expect, it } from "vitest";
import { getTreeEdgePath } from "./getTreeEdgePath";

describe("getTreeEdgePath", () => {
  it("returns straight line when x aligns", () => {
    expect(getTreeEdgePath(10, 0, 10, 100)).toBe("M 10 0 L 10 100");
  });

  it("places elbow mid-Y closer to child than midpoint for long spans", () => {
    const sy = 100;
    const ty = 400;
    const d = getTreeEdgePath(0, sy, 200, ty);
    const midAverage = (sy + ty) / 2;
    expect(d).toMatch(/L 0 ([\d.]+) L 200 \1/);
    const m = d.match(/L 0 ([\d.]+) L 200/);
    expect(m).not.toBeNull();
    const midY = Number(m![1]);
    expect(midY).toBeGreaterThan(midAverage);
    expect(midY).toBeLessThan(ty - 1);
    expect(midY).toBeGreaterThan(sy + 1);
  });
});
