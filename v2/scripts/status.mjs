import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function getWorkspaceTestCount(relPath) {
  const content = readFile(relPath);
  const testMatches = content.match(/\btest\(/g) ?? [];
  const itMatches = content.match(/\bit\(/g) ?? [];
  return testMatches.length + itMatches.length;
}

function printLine(label, value) {
  process.stdout.write(`${label}: ${value}\n`);
}

const statusDoc = 'docs/status/V2 Status Snapshot.md';
const capabilityDoc = 'docs/architecture/V2 Capability Matrix.md';
const determinismDoc = 'docs/architecture/V2 Determinism Spec.md';
const contractsFixtures = 'packages/contracts/fixtures';
const contractsSchemas = 'packages/contracts/schema';

process.stdout.write('V2 Status\n');
process.stdout.write('=========\n');
printLine('Status doc', fileExists(statusDoc) ? 'present' : 'missing');
printLine('Capability matrix', fileExists(capabilityDoc) ? 'present' : 'missing');
printLine('Determinism spec', fileExists(determinismDoc) ? 'present' : 'missing');
printLine('Contracts schema dir', fileExists(contractsSchemas) ? 'present' : 'missing');
printLine('Contracts fixtures dir', fileExists(contractsFixtures) ? 'present' : 'missing');

const runtimeWebTests = getWorkspaceTestCount('packages/runtime-web/src/project-store.test.ts')
  + getWorkspaceTestCount('packages/runtime-web/src/playtest-runner.test.ts')
  + getWorkspaceTestCount('packages/runtime-web/src/animation-player.test.ts')
  + getWorkspaceTestCount('packages/runtime-web/src/golden-project-smoke.test.ts');
const contractsTests = getWorkspaceTestCount('packages/contracts/src/schema-validation.test.ts')
  + getWorkspaceTestCount('packages/contracts/src/semantic-validation.test.ts');
const uiEditorTests = getWorkspaceTestCount('packages/ui-editor/src/editor-app.test.ts');

process.stdout.write('\nCoverage Signals\n');
process.stdout.write('----------------\n');
printLine('Contracts tests (approx)', contractsTests);
printLine('Runtime-web tests (approx)', runtimeWebTests);
printLine('UI-editor tests (approx)', uiEditorTests);

const snapshot = readFile(statusDoc);
const priorityHeader = '## Immediate Next 3 Priorities';
const idx = snapshot.indexOf(priorityHeader);

if (idx >= 0) {
  const tail = snapshot.slice(idx).split('\n').slice(0, 6).join('\n');
  process.stdout.write('\nNext Priorities\n');
  process.stdout.write('---------------\n');
  process.stdout.write(`${tail}\n`);
}
