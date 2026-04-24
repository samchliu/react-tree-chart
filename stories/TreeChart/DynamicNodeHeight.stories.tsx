import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import type { TreeNodeData, TreeNodeModel } from "../../src/types/tree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

const dynamicHeightTree: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "Root\nPlanning" },
  children: [
    {
      id: "vp",
      data: {
        label:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
      },
      children: []
    },
    {
      id: "vp2",
      data: { label: "VP Sales" },
      children: [
        {
          id: "ic1",
          data: { label: "Engineer" },
          children: [
            {
              id: "vp3",
              data: {
                label:
                  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
              },
              children: []
            }
          ]
        },
        {
          id: "ic2",
          data: { label: "Designer\n(UX)" },
          children: [
            { id: "ic3", data: { label: "FE Engineer" }, children: [] },
            { id: "ic4", data: { label: "BE Engineer" }, children: [] }
          ]
        }
      ]
    }
  ]
};

/** `nodeHeight="auto"` measures DOM height and re-layouts; use `contentOverflow="auto"` on custom cards for multiline text. */
export const DynamicNodeHeight: Story = {
  args: {
    tree: dynamicHeightTree,
    nodeHeight: "auto",
  }
};
