import type { QuestGraphV2 } from './story.js';

export type SemanticSeverity = 'error' | 'warning' | 'info';

export interface SemanticDiagnostic {
  code: string;
  severity: SemanticSeverity;
  path: string;
  message: string;
}

export interface SemanticValidationResult {
  ok: boolean;
  diagnostics: SemanticDiagnostic[];
}

/**
 * Validates cross-reference invariants that JSON Schema cannot enforce.
 */
export function validateQuestGraphSemantics(graph: QuestGraphV2): SemanticValidationResult {
  const diagnostics: SemanticDiagnostic[] = [];
  const seen = new Set<string>();
  const startNodeIds: string[] = [];
  let startCount = 0;

  graph.nodes.forEach((node, index) => {
    if (node.kind === 'start') {
      startCount += 1;
      startNodeIds.push(node.nodeId);
    }

    if (seen.has(node.nodeId)) {
      diagnostics.push({
        code: 'QUEST_DUPLICATE_NODE_ID',
        severity: 'error',
        path: `/nodes/${index}/nodeId`,
        message: `Duplicate nodeId '${node.nodeId}'.`,
      });
      return;
    }
    seen.add(node.nodeId);
  });

  if (startCount === 0) {
    diagnostics.push({
      code: 'QUEST_START_NODE_MISSING',
      severity: 'error',
      path: '/nodes',
      message: 'Quest graph must contain exactly one start node, found 0.',
    });
  } else if (startCount > 1) {
    diagnostics.push({
      code: 'QUEST_START_NODE_MULTIPLE',
      severity: 'error',
      path: '/nodes',
      message: `Quest graph must contain exactly one start node, found ${startCount}.`,
    });
  }

  graph.edges.forEach((edge, index) => {
    if (!seen.has(edge.from)) {
      diagnostics.push({
        code: 'QUEST_EDGE_FROM_MISSING',
        severity: 'error',
        path: `/edges/${index}/from`,
        message: `Edge 'from' references missing node '${edge.from}'.`,
      });
    }
    if (!seen.has(edge.to)) {
      diagnostics.push({
        code: 'QUEST_EDGE_TO_MISSING',
        severity: 'error',
        path: `/edges/${index}/to`,
        message: `Edge 'to' references missing node '${edge.to}'.`,
      });
    }
  });

  // Reachability warning: only meaningful when there is exactly one start node.
  if (startCount === 1) {
    const adjacency = new Map<string, string[]>();
    graph.nodes.forEach((node) => adjacency.set(node.nodeId, []));
    graph.edges.forEach((edge) => {
      if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
        adjacency.get(edge.from)?.push(edge.to);
      }
    });

    const reachable = new Set<string>();
    const queue: string[] = [startNodeIds[0]];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || reachable.has(current)) continue;
      reachable.add(current);
      const next = adjacency.get(current) ?? [];
      next.forEach((id) => {
        if (!reachable.has(id)) {
          queue.push(id);
        }
      });
    }

    graph.nodes.forEach((node, index) => {
      if (!reachable.has(node.nodeId)) {
        diagnostics.push({
          code: 'QUEST_NODE_UNREACHABLE',
          severity: 'warning',
          path: `/nodes/${index}`,
          message: `Node '${node.nodeId}' is unreachable from start node '${startNodeIds[0]}'.`,
        });
      }
    });
  }

  return {
    ok: diagnostics.every((d) => d.severity !== 'error'),
    diagnostics,
  };
}
