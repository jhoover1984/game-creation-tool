/**
 * Pure rendering functions for the onboarding checklist panel.
 * No state, no side effects.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-PLAYFLOW-001
 */

import type { OnboardingStep, OnboardingPreferences } from './onboarding-store.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderOnboardingChecklist(
  steps: readonly OnboardingStep[],
  mode: 'beginner' | 'pro',
  prefs: Readonly<OnboardingPreferences>,
): string {
  const total = steps.length;
  const done = steps.filter((s) => s.complete).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const stepItems = steps.map((s) => {
    const cls = s.complete ? 'checklist-step checklist-step--done' : 'checklist-step';
    return `<li class="${cls}"><span class="checklist-check">${s.complete ? '&#10003;' : '&#9675;'}</span>${escapeHtml(s.label)}</li>`;
  }).join('');

  const modeLabel = mode === 'beginner' ? 'Switch to Pro mode' : 'Switch to Beginner mode';

  const dismissLine = prefs.showProjectChecklist
    ? `<button class="checklist-action" data-action="dismiss-checklist">Hide checklist</button>`
    : '';

  // Quick Setup CTA: visible until 'playable-scene-ready' step is complete. UI-PLAYFLOW-001.
  const starterStep = steps.find((s) => s.id === 'playable-scene-ready');
  const starterCta = !starterStep?.complete
    ? `<div class="checklist-quickstart">
  <p class="empty-state">Ready to play? One click adds a starter scene with ground and a player.</p>
  <button class="checklist-action" data-action="add-starter">Add Starter Scene</button>
</div>`
    : '';

  // Flow hint: shown after starter scene is ready, until user dismisses. UI-PLAYFLOW-001.
  const flowHint = starterStep?.complete && prefs.showFlowHint
    ? `<div class="checklist-flow-hint">
  <p>Flow: Paint map &#8594; Add Player &#8594; Play &#8594; Move (arrows) &#8594; Interact (E)</p>
  <button class="checklist-action" data-action="dismiss-flow-hint">Dismiss</button>
</div>`
    : '';

  return `<div class="onboarding-checklist">
  <div class="checklist-header">
    <span class="checklist-title">Getting Started</span>
    <span class="checklist-progress">${done}/${total}</span>
  </div>
  <div class="checklist-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="checklist-bar-fill" style="width:${pct}%"></div>
  </div>
  <ul class="checklist-steps">${stepItems}</ul>
  ${starterCta}
  ${flowHint}
  <div class="checklist-actions">
    <button class="checklist-action" data-action="toggle-mode">${escapeHtml(modeLabel)}</button>
    <button class="checklist-action" data-action="reset-onboarding">Reset</button>
    ${dismissLine}
  </div>
</div>`;
}
