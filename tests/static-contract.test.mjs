import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

function attrFor(tag, name) {
  const match = new RegExp(`${name}="([^"]+)"`).exec(tag);
  return match?.[1] || '';
}

function allTags(tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map(([tag]) => tag);
}

test('page keeps the static assets and app mount points wired for GitHub Pages', () => {
  assert.match(html, /<link[^>]+href="\.\/styles\/app\.css"/);
  assert.match(html, /<script[^>]+type="module"[^>]+src="\.\/js\/main\.js"/);

  for (const role of [
    'board-title',
    'board-subtitle',
    'stats',
    'insights',
    'count',
    'list',
    'editor',
    'secondary-primary',
    'secondary-secondary',
  ]) {
    assert.match(html, new RegExp(`data-role="${role}"`), `missing data-role="${role}"`);
  }
});

test('primary controls remain discoverable and accessible in the static shell', () => {
  const buttons = allTags('button');
  const actions = buttons.map((tag) => attrFor(tag, 'data-action')).filter(Boolean);

  assert.deepEqual(actions, ['import', 'export', 'new', 'reset']);

  for (const action of ['import', 'export', 'new', 'reset']) {
    const tag = buttons.find((button) => attrFor(button, 'data-action') === action);
    assert.ok(attrFor(tag, 'aria-label'), `${action} button needs an aria-label`);
    assert.equal(attrFor(tag, 'type'), 'button', `${action} should not submit if controls move into a form`);
  }

  assert.match(html, /data-role="list"[^>]+aria-live="polite"/);
  assert.match(html, /type="search"[^>]+aria-label="Search habits, notes, cues, and resets"/);
});

test('backup import control only accepts JSON files', () => {
  const importInput = allTags('input').find((tag) => attrFor(tag, 'id') === 'import-file');

  assert.ok(importInput, 'missing hidden import file input');
  assert.equal(attrFor(importInput, 'type'), 'file');
  assert.equal(attrFor(importInput, 'accept'), '.json,application/json');
  assert.match(importInput, /\shidden(?:\s|>|$)/);
});

test('Pages workflow runs the local verification contract before deploy', () => {
  assert.match(workflow, /node --check js\/main\.js/);
  assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /enablement: true/);
});
