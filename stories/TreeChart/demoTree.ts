import type { TreeNodeData, TreeNodeModel } from "../../src/types/tree";

export const demoTree: TreeNodeModel<TreeNodeData> = {
  id: "root",
  data: { label: "A" },
  children: [
    {
      id: "dept-1",
      data: { label: "B" },
      children: [
        { id: "rd-1", data: { label: "C" }, children: [] },
        { id: "rd-2", data: { label: "D" }, children: [] }
      ]
    },
    {
      id: "dept-2",
      data: { label: "E" },
      children: []
    }
  ]
};
