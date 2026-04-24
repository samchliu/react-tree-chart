import type { TreeNodeModel } from "../../types/tree";

type MoveNodeArgs<T> = {
  tree: TreeNodeModel<T>;
  sourceId: string;
  targetId: string;
  mode: "child" | "sibling";
  siblingAfterId?: string;
};

type RemoveResult<T> = {
  removed?: TreeNodeModel<T>;
  tree: TreeNodeModel<T>;
};

function clone<T>(node: TreeNodeModel<T>): TreeNodeModel<T> {
  return {
    ...node,
    children: node.children.map(clone)
  };
}

function containsDescendant<T>(
  node: TreeNodeModel<T>,
  targetId: string
): boolean {
  if (node.id === targetId) {
    return true;
  }
  return node.children.some((child) => containsDescendant(child, targetId));
}

function removeNode<T>(
  node: TreeNodeModel<T>,
  sourceId: string
): RemoveResult<T> {
  const directIndex = node.children.findIndex((child) => child.id === sourceId);
  if (directIndex >= 0) {
    const children = [...node.children];
    const [removed] = children.splice(directIndex, 1);
    return { removed, tree: { ...node, children } };
  }

  let removed: TreeNodeModel<T> | undefined;
  const nextChildren = node.children.map((child) => {
    if (removed) {
      return child;
    }
    const result = removeNode(child, sourceId);
    if (result.removed) {
      removed = result.removed;
      return result.tree;
    }
    return child;
  });

  return { removed, tree: { ...node, children: nextChildren } };
}

function insertChild<T>(
  node: TreeNodeModel<T>,
  targetId: string,
  source: TreeNodeModel<T>
): TreeNodeModel<T> {
  if (node.id === targetId) {
    return { ...node, children: [...node.children, source] };
  }

  return {
    ...node,
    children: node.children.map((child) => insertChild(child, targetId, source))
  };
}

function insertSibling<T>(
  node: TreeNodeModel<T>,
  targetId: string,
  source: TreeNodeModel<T>,
  siblingAfterId?: string
): TreeNodeModel<T> {
  const targetIndex = node.children.findIndex((child) => child.id === targetId);
  if (targetIndex >= 0) {
    const children = [...node.children];
    const insertIndex =
      siblingAfterId != null
        ? Math.max(
            0,
            children.findIndex((child) => child.id === siblingAfterId) + 1
          )
        : targetIndex;
    children.splice(insertIndex, 0, source);
    return { ...node, children };
  }

  return {
    ...node,
    children: node.children.map((child) =>
      insertSibling(child, targetId, source, siblingAfterId)
    )
  };
}

export function canMoveNode<T>(
  tree: TreeNodeModel<T>,
  sourceId: string,
  targetId: string
): boolean {
  if (sourceId === targetId) {
    return false;
  }
  const source = findNodeById(tree, sourceId);
  if (!source) {
    return false;
  }
  return !containsDescendant(source, targetId);
}

export function findNodeById<T>(
  node: TreeNodeModel<T>,
  id: string
): TreeNodeModel<T> | undefined {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** One DFS pass — use for O(1) lookups per node instead of repeated `findNodeById`. */
export function indexTreeById<T>(
  root: TreeNodeModel<T>
): Map<string, TreeNodeModel<T>> {
  const map = new Map<string, TreeNodeModel<T>>();
  const walk = (n: TreeNodeModel<T>): void => {
    map.set(n.id, n);
    for (const child of n.children) {
      walk(child);
    }
  };
  walk(root);
  return map;
}

export function moveNode<T>(args: MoveNodeArgs<T>): TreeNodeModel<T> {
  const { tree, sourceId, targetId, mode, siblingAfterId } = args;
  const clonedTree = clone(tree);

  if (!canMoveNode(clonedTree, sourceId, targetId)) {
    return clonedTree;
  }

  if (clonedTree.id === sourceId) {
    return clonedTree;
  }

  const removed = removeNode(clonedTree, sourceId);
  if (!removed.removed) {
    return clonedTree;
  }

  if (mode === "child") {
    return insertChild(removed.tree, targetId, removed.removed);
  }

  return insertSibling(removed.tree, targetId, removed.removed, siblingAfterId);
}
