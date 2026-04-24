import { describe, expect, it } from "vitest";
import { bindNodeDragAndDrop, clientXToTargetLocalX } from "./pdndBridge";

describe("bindNodeDragAndDrop", () => {
  it("returns a cleanup function", () => {
    const el = document.createElement("div");
    const cleanup = bindNodeDragAndDrop(el, "node-1", {
      onDragStart: () => {}
    });
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("returns cleanup when draggable and droppable are disabled", () => {
    const el = document.createElement("div");
    const cleanup = bindNodeDragAndDrop(el, "node-1", {
      draggable: false,
      droppable: false
    });
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});

describe("clientXToTargetLocalX", () => {
  it("maps screen X into local width when the target is visually scaled (viewport zoom)", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "offsetWidth", {
      value: 200,
      configurable: true
    });
    const rect = {
      left: 100,
      width: 100,
      top: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => {}
    } as DOMRectReadOnly;
    // Midpoint of scaled rect → half of logical width
    expect(clientXToTargetLocalX(150, rect, el)).toBe(100);
  });
});
