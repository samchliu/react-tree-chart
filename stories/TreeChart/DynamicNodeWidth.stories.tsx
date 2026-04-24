import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import { TreeChartNode } from "../../src/components/TreeChartNode/TreeChartNode";
import type {
  TreeNodeData,
  TreeNodeModel,
  TreeChartRenderNodeProps
} from "../../src/types/tree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

const dynamicWidthTree: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "Root" },
  children: [
    {
      id: "narrow",
      data: { label: "Short" },
      children: []
    },
    {
      id: "wide",
      data: { label: "A much longer label so the card grows horizontally" },
      children: []
    }
  ]
};

/** `nodeWidth="auto"` measures card width from DOM and re-packs the tree horizontally. */
export const DynamicNodeWidth: Story = {
  args: {
    tree: dynamicWidthTree,
    nodeWidth: "auto",
    renderNode: (props) => {
      const p = props as TreeChartRenderNodeProps<TreeNodeData>;
      return (
        <TreeChartNode {...p}>
          <span style={{ whiteSpace: "nowrap" }}>{p.node.data.label}</span>
        </TreeChartNode>
      );
    }
  }
};
