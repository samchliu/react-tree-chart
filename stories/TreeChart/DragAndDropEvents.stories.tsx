import { useCallback, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import type {
  TreeChartChangeEvent,
  TreeChartDragOverEvent,
  TreeChartDragStartEvent,
  TreeChartDropEvent,
  TreeChartProps,
  TreeNodeData,
  TreeNodeModel
} from "../../src/types/tree";
import { demoTree } from "./demoTree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

type LogEntry =
  | { type: "dragStart"; event: TreeChartDragStartEvent<TreeNodeData> }
  | { type: "dragOver"; event: TreeChartDragOverEvent<TreeNodeData> }
  | { type: "drop"; event: TreeChartDropEvent<TreeNodeData> }
  | { type: "treeChange"; tree: TreeNodeModel<TreeNodeData> };

function EventLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        maxHeight: 74,
        overflowY: "auto",
        background: "rgba(15,15,15,0.88)",
        color: "#e2e8f0",
        fontFamily: "monospace",
        fontSize: 12,
        padding: "8px 12px",
        zIndex: 20
      }}
      className="tree-chart__nopan nopan"
    >
      {entries.length === 0 ? (
        <span style={{ color: "#94a3b8" }}>Drag a node to see events…</span>
      ) : (
        [...entries].reverse().map((entry, i) => {
          const color =
            entry.type === "dragStart"
              ? "#86efac"
              : entry.type === "dragOver"
                ? "#93c5fd"
                : entry.type === "drop"
                  ? "#fbbf24"
                  : "#e879f9";
          const label =
            entry.type === "dragStart"
              ? `onDragStart   source="${entry.event.sourceNode.data.label}"`
              : entry.type === "dragOver"
                ? `onDragOver    source="${entry.event.sourceNode.data.label}" → target="${entry.event.targetNode.data.label}" intent="${entry.event.intent.mode}"`
                : entry.type === "drop"
                  ? `onDrop        source="${entry.event.sourceNode.data.label}" → target="${entry.event.targetNode.data.label}" intent="${entry.event.intent.mode}"`
                  : `onTreeChange  nodes=${JSON.stringify(entry.tree, null, 2)}`;
          return (
            <div key={i} style={{ color, lineHeight: "1.6" }}>
              {label}
            </div>
          );
        })
      )}
    </div>
  );
}

function DragAndDropEventsDemo(args: TreeChartProps<TreeNodeData>) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const counterRef = useRef(0);

  const push = useCallback((entry: LogEntry) => {
    setLog((prev) => {
      const next = [...prev, entry];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  }, []);

  const handleDragStart = useCallback(
    (event: TreeChartDragStartEvent<TreeNodeData>) => {
      counterRef.current = 0;
      push({ type: "dragStart", event });
    },
    [push]
  );

  const handleDragOver = useCallback(
    (event: TreeChartDragOverEvent<TreeNodeData>) => {
      counterRef.current += 1;
      if (counterRef.current % 5 !== 1) return;
      push({ type: "dragOver", event });
    },
    [push]
  );

  const handleDrop = useCallback(
    (event: TreeChartDropEvent<TreeNodeData>) => {
      push({ type: "drop", event });
    },
    [push]
  );

  const handleTreeChange = useCallback(
    (event: TreeChartChangeEvent<TreeNodeData>) => {
      push({ type: "treeChange", tree: event.tree });
    },
    [push]
  );

  return (
    <TreeChart
      {...args}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onTreeChange={handleTreeChange}
    >
      <EventLog entries={log} />
    </TreeChart>
  );
}

/**
 * Drag any node to see `onDragStart`, `onDragOver`, `onDrop`, and
 * `onTreeChange` fire in the log panel at the bottom of the canvas.
 * `onDragOver` is throttled to every 5th call so the log stays readable.
 */
export const DragAndDropEvents: Story = {
  args: {
    tree: demoTree,
    showDropZones: true
  },
  render: (args) => {
    const props = args as TreeChartProps<TreeNodeData>;
    return <DragAndDropEventsDemo {...props} />;
  }
};
