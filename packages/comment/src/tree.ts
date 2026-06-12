/**
 * tree.ts — SPEC-COMMENT-001 Slice B
 *
 * Comment 트리 빌더 — 인접 리스트를 트리로 변환.
 *
 * REQ-COMMENT-020~023: adjacent list 패턴 + buildCommentTree + depth 계산.
 */

/**
 * 댓글 노드 타입.
 */
export type CommentNode<T extends { id: number; parentId: number | null }> = T & {
  children: CommentNode<T>[];
  depth?: number;
  __orphan?: boolean;
};

/**
 * 댓글 인접 리스트를 트리로 변환 (O(n) 단일 패스).
 *
 * @param comments — 평면 댓글 목록
 * @returns 트리 구조의 댓글 목록 (루트 노드만)
 */
export function buildCommentTree<
  T extends { id: number; parentId: number | null },
>(comments: T[]): CommentNode<T>[] {
  const map = new Map<number, CommentNode<T>>();
  const roots: CommentNode<T>[] = [];

  // 모든 노드를 map에 등록
  for (const c of comments) {
    map.set(c.id, { ...c, children: [], depth: undefined });
  }

  // parent-child 관계 연결
  for (const node of map.values()) {
    if (node.parentId != null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      // 고아 노드는 루트로 처리 (__orphan 마커 세팅)
      if (node.parentId != null && !map.has(node.parentId)) {
        node.__orphan = true;
      }
      roots.push(node);
    }
  }

  // depth 계산 (BFS)
  for (const root of roots) {
    calculateDepth(root, 0, map);
  }

  return roots;
}

/**
 * 트리 노드의 depth 계산.
 */
function calculateDepth<T extends { id: number; parentId: number | null }>(
  node: CommentNode<T>,
  currentDepth: number,
  map: Map<number, CommentNode<T>>,
): void {
  node.depth = currentDepth;
  for (const child of node.children) {
    calculateDepth(child, currentDepth + 1, map);
  }
}

/**
 * 댓글의 현재 depth를 계산 (루트=0).
 *
 * @param commentId — 대상 댓글 ID
 * @param comments — 평면 댓글 목록
 * @returns depth 값 (루트=0, 최대 4)
 */
export function getCommentDepth<
  T extends { id: number; parentId: number | null },
>(commentId: number, comments: T[]): number {
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  let depth = 0;
  let currentId: number | null = commentId;

  while (currentId != null) {
    const comment = commentMap.get(currentId);
    if (!comment || comment.parentId == null) {
      break; // 존재하지 않거나 루트 도달
    }
    // 부모가 map에 없으면 고아 노드 — depth 증가 없이 중단
    if (!commentMap.has(comment.parentId)) {
      break;
    }
    currentId = comment.parentId;
    depth++;
  }

  return depth;
}
