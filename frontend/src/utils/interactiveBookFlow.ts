import type {
  FlowGraphEdge,
  FlowGraphNode,
  FlowValidationIssue,
  FlowValidationResult,
  InteractiveBookManifest,
  InteractiveChoice,
  InteractiveInteraction,
  InteractiveLayer,
  InteractiveScene,
} from '@/types';

function contentRecord(scene: InteractiveScene): Record<string, unknown> {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    return {};
  }
  return scene.content as Record<string, unknown>;
}

function sceneTitle(scene: InteractiveScene, index: number): string {
  return scene.title?.trim() || `Scene ${index + 1}`;
}

function getSceneNext(scene: InteractiveScene): string[] {
  if (typeof scene.next === 'string' && scene.next.trim()) return [scene.next.trim()];
  if (Array.isArray(scene.next)) {
    return scene.next.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (scene.next && typeof scene.next === 'object') {
    const record = scene.next as Record<string, unknown>;
    const candidates = [record.scene_id, record.target_scene_id, record.default];
    return candidates.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
}

function getChoiceTarget(choice: InteractiveChoice): string | undefined {
  return typeof choice.target_scene_id === 'string' && choice.target_scene_id.trim()
    ? choice.target_scene_id.trim()
    : undefined;
}

function getInteractionTargets(interaction: InteractiveInteraction): string[] {
  const targets: string[] = [];
  if (typeof interaction.target_scene_id === 'string' && interaction.target_scene_id.trim()) {
    targets.push(interaction.target_scene_id.trim());
  }
  interaction.choices?.forEach((choice) => {
    const target = getChoiceTarget(choice);
    if (target) targets.push(target);
  });
  return targets;
}

function getLayers(scene: InteractiveScene): InteractiveLayer[] {
  const layers = contentRecord(scene).layers;
  return Array.isArray(layers)
    ? layers.filter((item): item is InteractiveLayer => Boolean(item) && typeof item === 'object' && typeof (item as InteractiveLayer).id === 'string')
    : [];
}

function addEdge(
  edges: FlowGraphEdge[],
  from: string,
  to: string,
  label: string,
  kind: FlowGraphEdge['kind'],
  valid: boolean,
) {
  edges.push({
    id: `${from}:${kind}:${label}:${to}:${edges.length}`,
    from,
    to,
    label,
    kind,
    valid,
  });
}

function collectEdges(manifest: InteractiveBookManifest, sceneIds: Set<string>): FlowGraphEdge[] {
  const edges: FlowGraphEdge[] = [];

  manifest.scenes.forEach((scene, index) => {
    const explicitNext = getSceneNext(scene);
    explicitNext.forEach((target) => {
      addEdge(edges, scene.id, target, 'Next', 'next', sceneIds.has(target));
    });

    (scene.interactions ?? []).forEach((interaction, interactionIndex) => {
      if (typeof interaction.target_scene_id === 'string' && interaction.target_scene_id.trim()) {
        addEdge(
          edges,
          scene.id,
          interaction.target_scene_id.trim(),
          interaction.prompt || interaction.id || `Interaction ${interactionIndex + 1}`,
          'interaction',
          sceneIds.has(interaction.target_scene_id.trim()),
        );
      }

      (interaction.choices ?? []).forEach((choice, choiceIndex) => {
        const target = getChoiceTarget(choice);
        if (!target) return;
        addEdge(
          edges,
          scene.id,
          target,
          choice.label || `Choice ${choiceIndex + 1}`,
          'choice',
          sceneIds.has(target),
        );
      });
    });

    const content = contentRecord(scene);
    if (scene.type === 'connect_the_dots') {
      const target = typeof content.success_target_scene_id === 'string'
        ? content.success_target_scene_id.trim()
        : '';
      if (target) {
        addEdge(edges, scene.id, target, 'Connect dots complete', 'connect_the_dots', sceneIds.has(target));
      }
    }

    getLayers(scene).forEach((layer) => {
      const target = layer.action?.target_scene_id || layer.action?.scene_id;
      if (typeof target === 'string' && target.trim()) {
        addEdge(edges, scene.id, target.trim(), layer.text || layer.id, 'layer', sceneIds.has(target.trim()));
      }
    });

    const hasOutgoingEdge = edges.some((edge) => edge.from === scene.id);
    if (!hasOutgoingEdge) {
      const implicitNext = manifest.scenes[index + 1]?.id;
      if (implicitNext) {
        addEdge(edges, scene.id, implicitNext, 'Implicit next', 'implicit_next', sceneIds.has(implicitNext));
      }
    }
  });

  return edges;
}

function reachableFrom(entrySceneId: string, edges: FlowGraphEdge[], sceneIds: Set<string>): Set<string> {
  const reachable = new Set<string>();
  if (!sceneIds.has(entrySceneId)) return reachable;
  const adjacency = new Map<string, string[]>();
  edges.filter((edge) => edge.valid).forEach((edge) => {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  });

  const stack = [entrySceneId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    (adjacency.get(current) ?? []).forEach((next) => {
      if (!reachable.has(next)) stack.push(next);
    });
  }
  return reachable;
}

function computeTerminalReachability(sceneIds: string[], edges: FlowGraphEdge[]): Set<string> {
  const validEdges = edges.filter((edge) => edge.valid);
  const outgoing = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  sceneIds.forEach((sceneId) => {
    outgoing.set(sceneId, []);
    reverse.set(sceneId, []);
  });
  validEdges.forEach((edge) => {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    reverse.set(edge.to, [...(reverse.get(edge.to) ?? []), edge.from]);
  });

  const terminalSceneIds = sceneIds.filter((sceneId) => (outgoing.get(sceneId) ?? []).length === 0);
  const canReachTerminal = new Set<string>();
  const stack = [...terminalSceneIds];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || canReachTerminal.has(current)) continue;
    canReachTerminal.add(current);
    (reverse.get(current) ?? []).forEach((previous) => {
      if (!canReachTerminal.has(previous)) stack.push(previous);
    });
  }
  return canReachTerminal;
}

function strongComponents(sceneIds: string[], edges: FlowGraphEdge[]): string[][] {
  const adjacency = new Map<string, string[]>();
  sceneIds.forEach((sceneId) => adjacency.set(sceneId, []));
  edges.filter((edge) => edge.valid).forEach((edge) => {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  });

  let index = 0;
  const indexByNode = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (node: string) => {
    indexByNode.set(node, index);
    lowLink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    (adjacency.get(node) ?? []).forEach((next) => {
      if (!indexByNode.has(next)) {
        visit(next);
        lowLink.set(node, Math.min(lowLink.get(node) ?? 0, lowLink.get(next) ?? 0));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node) ?? 0, indexByNode.get(next) ?? 0));
      }
    });

    if (lowLink.get(node) === indexByNode.get(node)) {
      const component: string[] = [];
      let current: string | undefined;
      do {
        current = stack.pop();
        if (!current) break;
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      components.push(component);
    }
  };

  sceneIds.forEach((sceneId) => {
    if (!indexByNode.has(sceneId)) visit(sceneId);
  });

  return components;
}

function isCyclicComponent(component: string[], edges: FlowGraphEdge[]): boolean {
  if (component.length > 1) return true;
  const only = component[0];
  return edges.some((edge) => edge.valid && edge.from === only && edge.to === only);
}

function makeIssue(
  code: string,
  message: string,
  sceneId?: string,
  targetSceneId?: string,
): FlowValidationIssue {
  return {
    id: `${code}:${sceneId ?? 'manifest'}:${targetSceneId ?? ''}`,
    severity: code.startsWith('warning') ? 'warning' : 'blocking',
    code,
    message,
    sceneId,
    targetSceneId,
  };
}

export function validateInteractiveBookFlow(manifest: InteractiveBookManifest): FlowValidationResult {
  const sceneIds = manifest.scenes.map((scene) => scene.id);
  const sceneIdSet = new Set(sceneIds);
  const duplicateSceneIds = Array.from(new Set(sceneIds.filter((sceneId, index) => sceneIds.indexOf(sceneId) !== index)));
  const blockingErrors: FlowValidationIssue[] = [];
  const warnings: FlowValidationIssue[] = [];

  if (!manifest.entry_scene_id || !sceneIdSet.has(manifest.entry_scene_id)) {
    blockingErrors.push(makeIssue(
      'missing_entry_scene',
      `Entry scene "${manifest.entry_scene_id || '(empty)'}" does not exist.`,
      manifest.entry_scene_id,
    ));
  }

  duplicateSceneIds.forEach((sceneId) => {
    blockingErrors.push(makeIssue('duplicate_scene_id', `Scene id "${sceneId}" is duplicated.`, sceneId));
  });

  const edges = collectEdges(manifest, sceneIdSet);
  edges.filter((edge) => !edge.valid).forEach((edge) => {
    blockingErrors.push(makeIssue(
      'broken_target',
      `Scene "${edge.from}" points to missing scene "${edge.to}" via ${edge.label}.`,
      edge.from,
      edge.to,
    ));
  });

  manifest.scenes.forEach((scene, index) => {
    const title = sceneTitle(scene, index);
    const content = contentRecord(scene);
    const hasQuestionChoices = (scene.interactions ?? []).some((interaction) => (interaction.choices?.length ?? 0) > 0);
    const hasPrimaryMedia = typeof content.video_url === 'string'
      || typeof content.image_url === 'string'
      || typeof content.poster_url === 'string';
    if (!scene.title?.trim()) {
      warnings.push(makeIssue('warning_missing_title', `${title} has no title.`, scene.id));
    }
    if ((scene.type === 'quiz' || scene.type === 'branching') && !hasQuestionChoices) {
      warnings.push(makeIssue('warning_missing_question', `${title} has no choices or question interaction.`, scene.id));
    }
    if (scene.type === 'media' && Boolean(content.question_enabled) && !hasQuestionChoices) {
      warnings.push(makeIssue('warning_missing_question', `${title} has question mode enabled but no choices configured.`, scene.id));
    }
    if (scene.type === 'media' && !hasPrimaryMedia) {
      warnings.push(makeIssue('warning_missing_media', `${title} has no image or video assigned.`, scene.id));
    }
    if (scene.type === 'connect_the_dots') {
      const points = content.points;
      if (!Array.isArray(points) || points.length < 2) {
        warnings.push(makeIssue('warning_connect_dots_points', `${title} should have at least two ordered points.`, scene.id));
      }
    }
  });

  const reachableSceneIds = reachableFrom(manifest.entry_scene_id, edges, sceneIdSet);
  manifest.scenes.forEach((scene, index) => {
    if (!reachableSceneIds.has(scene.id)) {
      warnings.push(makeIssue('warning_unreachable_scene', `${sceneTitle(scene, index)} is not reachable from entry scene.`, scene.id));
    }
  });

  const terminalReachability = computeTerminalReachability(sceneIds, edges);
  const completionReachable = sceneIdSet.has(manifest.entry_scene_id)
    && terminalReachability.has(manifest.entry_scene_id);

  if (!completionReachable) {
    blockingErrors.push(makeIssue(
      'completion_not_reachable',
      'There is no reachable path from entry scene to a terminal completion scene.',
      manifest.entry_scene_id,
    ));
  }

  const components = strongComponents(sceneIds, edges);
  const blockingLoopSceneIds = new Set<string>();
  const validLoopSceneIds = new Set<string>();

  components.forEach((component) => {
    if (!isCyclicComponent(component, edges)) return;
    const hasExitToCompletion = component.some((sceneId) => terminalReachability.has(sceneId));
    const reachableLoop = component.some((sceneId) => reachableSceneIds.has(sceneId));
    if (!reachableLoop) return;
    if (!hasExitToCompletion) {
      component.forEach((sceneId) => blockingLoopSceneIds.add(sceneId));
      blockingErrors.push(makeIssue(
        'dead_end_loop',
        `Dead-end loop has no exit to completion: ${component.join(' -> ')}.`,
        component[0],
      ));
      return;
    }
    component.forEach((sceneId) => validLoopSceneIds.add(sceneId));
  });

  const blockingSceneIds = new Set(blockingErrors.map((issue) => issue.sceneId).filter((item): item is string => Boolean(item)));
  const nodes: FlowGraphNode[] = manifest.scenes.map((scene, index) => ({
    id: scene.id,
    title: sceneTitle(scene, index),
    type: scene.type,
    status: blockingSceneIds.has(scene.id) || blockingLoopSceneIds.has(scene.id)
      ? 'blocking'
      : validLoopSceneIds.has(scene.id)
        ? 'loop'
        : reachableSceneIds.has(scene.id)
          ? 'reachable'
          : 'unreachable',
  }));

  return {
    blockingErrors,
    warnings,
    nodes,
    edges,
    reachableSceneIds: Array.from(reachableSceneIds),
    completionReachable,
  };
}
