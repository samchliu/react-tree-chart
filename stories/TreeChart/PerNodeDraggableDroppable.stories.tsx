import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import type { TreeNodeData, TreeNodeModel } from "../../src/types/tree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * All four boolean pairs appear exactly once (two booleans ⇒ four cases).
 * draggable / droppable are set directly on the tree data — no renderNode needed.
 */
const perNodeDndTree: TreeNodeModel<TreeNodeData> = {
  id: "node-tt",
  data: { label: "Drag ✓ · Drop ✓ (root)" },
  children: [
    {
      id: "node-tf",
      data: { label: "Drag ✓ · Drop ✗" },
      droppable: false,
      children: []
    },
    {
      id: "node-ft",
      data: { label: "Drag ✗ · Drop ✓" },
      draggable: false,
      children: []
    },
    {
      id: "node-ff",
      data: { label: "Drag ✗ · Drop ✗" },
      draggable: false,
      droppable: false,
      children: []
    }
  ]
};

export const PerNodeDraggableDroppable: Story = {
  args: {
    tree: perNodeDndTree
  }
};
