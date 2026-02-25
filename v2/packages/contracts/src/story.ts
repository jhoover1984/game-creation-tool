export type ConditionOp = 'and' | 'or' | 'not' | 'cmp' | 'hasTag' | 'questState';

export interface StoryCondition {
  op: ConditionOp;
  key?: string;
  cmp?: '==' | '!=' | '<' | '<=' | '>' | '>=';
  value?: number | string | boolean;
  children?: StoryCondition[];
}

export type StoryEffectKind = 'setFlag' | 'addItem' | 'modifyRep' | 'spawnEntity' | 'emitRumor';

export interface StoryEffect {
  kind: StoryEffectKind;
  key?: string;
  value?: number | string | boolean;
  asset?: { assetId: string; subId?: string };
  amount?: number;
}

export interface QuestGraphNode {
  nodeId: string;
  kind: 'start' | 'objective' | 'branch' | 'reward' | 'end';
  name: string;
  conditions?: StoryCondition[];
  effects?: StoryEffect[];
}

export interface QuestGraphEdge {
  from: string;
  to: string;
  label?: string;
  conditions?: StoryCondition[];
}

export interface QuestGraphV2 {
  schemaVersion: '2.0.0';
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];
}
