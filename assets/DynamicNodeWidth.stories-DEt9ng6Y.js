import{j as a}from"./jsx-runtime-BjG_zV1W.js";import{t as p,a as c}from"./meta--79DXzYH.js";import"./index-B3e6rcmj.js";import"./_commonjsHelpers-Cpj98o6Y.js";const N={...p},h={id:"root",data:{label:"Root"},children:[{id:"narrow",data:{label:"Short"},children:[]},{id:"wide",data:{label:"A much longer label so the card grows horizontally"},children:[]}]},e={args:{tree:h,nodeWidth:"auto",renderNode:i=>{const r=i;return a.jsx(c,{...r,children:a.jsx("span",{style:{whiteSpace:"nowrap"},children:r.node.data.label})})}}};var t,o,d,n,s;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    tree: dynamicWidthTree,
    nodeWidth: "auto",
    renderNode: props => {
      const p = props as TreeChartRenderNodeProps<TreeNodeData>;
      return <TreeChartNode {...p}>\r
          <span style={{
          whiteSpace: "nowrap"
        }}>{p.node.data.label}</span>\r
        </TreeChartNode>;
    }
  }
}`,...(d=(o=e.parameters)==null?void 0:o.docs)==null?void 0:d.source},description:{story:'`nodeWidth="auto"` measures card width from DOM and re-packs the tree horizontally.',...(s=(n=e.parameters)==null?void 0:n.docs)==null?void 0:s.description}}};const w=["DynamicNodeWidth"];export{e as DynamicNodeWidth,w as __namedExportsOrder,N as default};
