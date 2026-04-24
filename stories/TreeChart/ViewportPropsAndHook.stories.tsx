import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import { useTreeChartController } from "../../src/hooks/useTreeChartController";
import { demoTree } from "./demoTree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

function HookFitPanel() {
  const { fitView, zoomIn, zoomOut, getViewport, setViewport, collapseAll, expandAll } =
    useTreeChartController();
  const [viewportReadout, setViewportReadout] = useState("—");

  return (
    <div
      className="tree-chart__nopan nopan"
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 340,
        padding: 10,
        background: "rgba(255, 255, 255, 0.94)",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
        fontSize: 12
      }}
    >
      <div style={{ fontWeight: 600, color: "#222" }}>
        useTreeChartController
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" onClick={() => collapseAll()}>
          collapseAll()
        </button>
        <button type="button" onClick={() => expandAll()}>
          expandAll()
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" onClick={() => fitView()}>
          fitView()
        </button>
        <button
          type="button"
          onClick={() => fitView({ padding: 0.1, duration: 400 })}
        >
          fitView(pad + duration)
        </button>
        <button type="button" onClick={() => zoomIn()}>
          zoomIn()
        </button>
        <button type="button" onClick={() => zoomOut()}>
          zoomOut()
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center"
        }}
      >
        <button
          type="button"
          onClick={() => {
            const v = getViewport();
            setViewportReadout(
              `x: ${v.x.toFixed(1)}, y: ${v.y.toFixed(1)}, zoom: ${v.zoom.toFixed(3)}`
            );
          }}
        >
          getViewport()
        </button>
        <span style={{ fontFamily: "monospace", color: "#333" }}>
          {viewportReadout}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          type="button"
          onClick={() =>
            setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
          }
        >
          setViewport(origin, duration)
        </button>
        <button
          type="button"
          onClick={() => {
            const v = getViewport();
            setViewport({ ...v, x: v.x + 80, y: v.y + 40 });
          }}
        >
          setViewport(nudge)
        </button>
      </div>
    </div>
  );
}

export const ViewportPropsAndHook: Story = {
  args: {
    tree: demoTree
  },
  render: (args) => (
    <TreeChart {...args}>
      <HookFitPanel />
    </TreeChart>
  )
};
