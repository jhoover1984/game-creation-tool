import type { QuestGraphNode } from '@gcs/contracts';
import { readTextField } from './schema-inspector.js';

export interface StoryPanelAppAdapter {
  getQuestNodes(): readonly QuestGraphNode[];
  getSelectedQuestNode(): QuestGraphNode | null;
  selectQuestNode(nodeId: string | null): QuestGraphNode | null;
  updateQuestNodeBasics(
    nodeId: string,
    fields: { name: string; kind: QuestGraphNode['kind'] },
  ): boolean;
}

const KIND_OPTIONS: Array<QuestGraphNode['kind']> = ['start', 'objective', 'branch', 'reward', 'end'];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class StoryPanelController {
  private readonly app: StoryPanelAppAdapter;
  private readonly container: HTMLElement;
  private readonly onClickHandler: (event: Event) => void;
  private readonly onChangeHandler: (event: Event) => void;
  private readonly onMutate: (() => void) | undefined;

  constructor(app: StoryPanelAppAdapter, container: HTMLElement, onMutate?: () => void) {
    this.app = app;
    this.container = container;
    this.onMutate = onMutate;
    this.onClickHandler = (event: Event) => this.handleClick(event);
    this.onChangeHandler = (event: Event) => this.handleChange(event);
    this.container.addEventListener('click', this.onClickHandler);
    this.container.addEventListener('change', this.onChangeHandler);
    this.refresh();
  }

  refresh(): void {
    const nodes = this.app.getQuestNodes();
    if (nodes.length === 0) {
      this.container.innerHTML = '<p class="empty-state">No story nodes yet. Add an Interact trigger to an entity to create story events.</p>';
      return;
    }

    const selected = this.app.getSelectedQuestNode() ?? nodes[0];
    if (!this.app.getSelectedQuestNode()) {
      this.app.selectQuestNode(selected.nodeId);
    }

    const options = nodes
      .map((n) => {
        const selectedAttr = n.nodeId === selected.nodeId ? ' selected' : '';
        return `<option value="${escapeHtml(n.nodeId)}"${selectedAttr}>${escapeHtml(n.nodeId)} :: ${escapeHtml(n.name)}</option>`;
      })
      .join('');
    const kindOptions = KIND_OPTIONS
      .map((kind) => {
        const selectedAttr = selected.kind === kind ? ' selected' : '';
        return `<option value="${kind}"${selectedAttr}>${kind}</option>`;
      })
      .join('');

    this.container.innerHTML = `
      <div class="inspector">
        <h2>Story</h2>
        <div class="inspector-field">
          <label for="story-node-select">Node</label>
          <select id="story-node-select" data-path="nodeId">${options}</select>
        </div>
        <div class="inspector-field">
          <label for="story-name-input">Name</label>
          <input id="story-name-input" data-path="name" type="text" value="${escapeHtml(selected.name)}">
        </div>
        <div class="inspector-field">
          <label for="story-kind-select">Kind</label>
          <select id="story-kind-select" data-path="kind">${kindOptions}</select>
        </div>
        <button data-action="apply-story-inspector">Apply Story Node</button>
      </div>
    `;
  }

  dispose(): void {
    this.container.removeEventListener('click', this.onClickHandler);
    this.container.removeEventListener('change', this.onChangeHandler);
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.getAttribute('data-path') !== 'nodeId') return;
    const select = target as HTMLSelectElement;
    this.app.selectQuestNode(select.value || null);
    this.refresh();
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.getAttribute('data-action') !== 'apply-story-inspector') {
      return;
    }
    const node = this.app.getSelectedQuestNode();
    if (!node) return;
    const name = readTextField(this.container, 'name');
    const kindSelect = this.container.querySelector('[data-path="kind"]') as HTMLSelectElement | null;
    if (!name || !kindSelect) return;
    const kind = kindSelect.value as QuestGraphNode['kind'];
    const ok = this.app.updateQuestNodeBasics(node.nodeId, { name, kind });
    if (!ok) return;
    this.onMutate?.();
    this.refresh();
  }
}
