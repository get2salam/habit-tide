import assert from 'node:assert/strict';
import test from 'node:test';

const elements = new Map();
const staleFilterBackup = JSON.stringify({
  items: [
    {
      id: 'kept-habit',
      title: 'Habit from before a category rename',
      category: 'Work',
      state: 'Riding',
      score: 5,
      effort: 3,
      metric: 5,
      date: '2026-04-25',
    },
  ],
  ui: { search: '', category: 'Fitness', status: 'Dormant', selectedId: 'kept-habit' },
});

function stubElement() {
  return {
    className: '',
    dataset: {},
    files: [],
    value: '',
    classList: { add() {}, remove() {} },
    appendChild() {},
    click() {},
    closest() { return null; },
    focus() {},
    remove() {},
    setAttribute() {},
    set innerHTML(value) { this._innerHTML = value; },
    get innerHTML() { return this._innerHTML || ''; },
    set textContent(value) { this._textContent = value; },
    get textContent() { return this._textContent || ''; },
  };
}

globalThis.document = {
  body: { appendChild() {} },
  addEventListener() {},
  createElement: stubElement,
  querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, stubElement());
    return elements.get(selector);
  },
};

globalThis.localStorage = {
  getItem() { return staleFilterBackup; },
  setItem() {},
};

const app = await import('../js/main.js');

test('normalizeUi falls back to "all" for a category or status that no longer exists in SPEC', () => {
  const ui = app.normalizeUi({ search: 'x', category: 'Fitness', status: 'Dormant', selectedId: 'a' });

  assert.equal(ui.category, 'all');
  assert.equal(ui.status, 'all');
  assert.equal(ui.search, 'x');
  assert.equal(ui.selectedId, 'a');
});

test('normalizeUi keeps a valid, current category and status untouched', () => {
  const ui = app.normalizeUi({ category: 'Health', status: 'Slipping' });

  assert.equal(ui.category, 'Health');
  assert.equal(ui.status, 'Slipping');
});

test('a persisted backup with a stale filter no longer hides every habit on load', () => {
  const listHtml = elements.get('[data-role="list"]').innerHTML;

  assert.match(listHtml, /Habit from before a category rename/);

  const categoryOptions = elements.get('[data-field="category"]').innerHTML;
  const statusOptions = elements.get('[data-field="status"]').innerHTML;
  assert.doesNotMatch(categoryOptions, /selected/, 'no specific category should be pinned as selected');
  assert.doesNotMatch(statusOptions, /selected/, 'no specific status should be pinned as selected');
});
