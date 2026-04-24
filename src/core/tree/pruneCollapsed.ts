import type { TreeNodeModel } from "../../types/tree";

export function collectNodeIds<T>(tree: TreeNodeModel<T>): Set<string> {
  const ids = new Set<string>();
  const walk = (node: TreeNodeModel<T>): void => {
    ids.add(node.id);
    node.children.forEach(walk);
  };
  walk(tree);
  return ids;
}

/**
 * Collects the ids of all nodes in the subtree rooted at `root` that have
 * at least one child (i.e. nodes that can be collapsed).
 */
export function collectSubtreeParentIds<T>(
  root: TreeNodeModel<T>
): Set<string> {
  const ids = new Set<string>();
  const walk = (node: TreeNodeModel<T>): void => {
    if (node.children.length > 0) {
      ids.add(node.id);
      node.children.forEach(walk);
    }
  };
  walk(root);
  return ids;
}

/**
 * Returns a shallow copy of the tree where nodes in `collapsedIds` have no children
 * (so layout hides descendants). Does not mutate the original tree.
 */
export function pruneCollapsedForLayout<T>(
  tree: TreeNodeModel<T>,
  collapsedIds: ReadonlySet<string>
): TreeNodeModel<T> {
  const walk = (node: TreeNodeModel<T>): TreeNodeModel<T> => {
    if (collapsedIds.has(node.id)) {
      return { ...node, children: [] };
    }
    return {
      ...node,
      children: node.children.map(walk)
    };
  };
  return walk(tree);
}
