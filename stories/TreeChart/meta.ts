import type { Meta } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";

export const treeChartMeta = {
  title: "TreeChart/TreeChart",
  component: TreeChart,
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta<typeof TreeChart>;
