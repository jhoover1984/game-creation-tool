import { readTextField } from './schema-inspector.js';
const KIND_OPTIONS = ['start', 'objective', 'branch', 'reward', 'end'];
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
export class StoryPanelController {
    app;
    container;
    onClickHandler;
    onChangeHandler;
    onMutate;
    constructor(app, container, onMutate) {
        this.app = app;
        this.container = container;
        this.onMutate = onMutate;
        this.onClickHandler = (event) => this.handleClick(event);
        this.onChangeHandler = (event) => this.handleChange(event);
        this.container.addEventListener('click', this.onClickHandler);
        this.container.addEventListener('change', this.onChangeHandler);
        this.refresh();
    }
    refresh() {
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
    dispose() {
        this.container.removeEventListener('click', this.onClickHandler);
        this.container.removeEventListener('change', this.onChangeHandler);
    }
    handleChange(event) {
        const target = event.target;
        if (!target || target.getAttribute('data-path') !== 'nodeId')
            return;
        const select = target;
        this.app.selectQuestNode(select.value || null);
        this.refresh();
    }
    handleClick(event) {
        const target = event.target;
        if (!target || target.getAttribute('data-action') !== 'apply-story-inspector') {
            return;
        }
        const node = this.app.getSelectedQuestNode();
        if (!node)
            return;
        const name = readTextField(this.container, 'name');
        const kindSelect = this.container.querySelector('[data-path="kind"]');
        if (!name || !kindSelect)
            return;
        const kind = kindSelect.value;
        const ok = this.app.updateQuestNodeBasics(node.nodeId, { name, kind });
        if (!ok)
            return;
        this.onMutate?.();
        this.refresh();
    }
}
//# sourceMappingURL=story-panel-controller.js.map