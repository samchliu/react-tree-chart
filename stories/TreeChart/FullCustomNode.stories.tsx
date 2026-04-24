import type { Meta, StoryObj } from "@storybook/react";
import { TreeChart } from "../../src/components/TreeChart/TreeChart";
import type {
  TreeChartRenderNodeProps,
  TreeNodeData
} from "../../src/types/tree";
import { demoTree } from "./demoTree";
import { treeChartMeta } from "./meta";

const meta = { ...treeChartMeta } satisfies Meta<typeof TreeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

function FullCustomNodeView(props: TreeChartRenderNodeProps<TreeNodeData>) {
  const { node, hasChildren, collapsed, onToggleCollapse } = props;
  return (
    <div
      style={{
        border: "1px solid black",
        minWidth: 100,
        minHeight: "fit-content",
        padding: 12,
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "flex-start",
          minWidth: 0
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#57606a",
              background: "#f6f8fa",
              border: "1px solid #d0d7de",
              borderRadius: 6,
              padding: "2px 8px"
            }}
          >
            custom
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#1f2328",
              background: "#ddf4ff",
              border: "1px solid #54aeff66",
              borderRadius: 6,
              padding: "2px 8px"
            }}
          >
            {node.id}
          </span>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            width: "100%"
          }}
        >
          {node.data.label}
        </div>
      </div>
      {hasChildren ? (
        <button
          type="button"
          className="nodrag nopan"
          onClick={onToggleCollapse}
          style={{ marginTop: 10 }}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      ) : null}
    </div>
  );
}

export const FullCustomNode: Story = {
  args: {
    tree: demoTree,
    nodeWidth: "auto",
    nodeHeight: "auto",
    renderNode: (props) => (
      <FullCustomNodeView
        {...(props as TreeChartRenderNodeProps<TreeNodeData>)}
      />
    )
  }
};
