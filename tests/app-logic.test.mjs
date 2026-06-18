import assert from 'node:assert/strict';
import test from 'node:test';

const elements = new Map();
const storedBackup = JSON.stringify({
  items: [
    {
      id: 'imported-risky-habit',
      title: '<img src=x onerror=alert(1)>Morning tide',
      note: 'Keep <script>alert(1)</script> out of habit notes',
      category: 'Work',
      state: 'Riding',
      score: 10,
      effort: 1,
      metric: 10,
      textOne: '<svg onload=alert(1)>After tea',
      textTwo: 'Reset with <iframe src=bad></iframe>',
      date: '2099-04-25',
    },
  ],
  ui: { search: '', category: 'all', status: 'all', selectedId: 'imported-risky-habit' },
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
  getItem() { return storedBackup; },
  setItem() {},
};

const app = await import('../js/main.js');

test('normalizes corrupted numeric and date fields from backups', () => {
  const item = app.normalize({
    title: 'Imported bad backup row',
    score: 'high',
    effort: Number.POSITIVE_INFINITY,
    metric: 'NaN',
    date: '2026-02-31',
  });

  assert.equal(item.score, 7);
  assert.equal(item.effort, 3);
  assert.equal(item.metric, 6);
  assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(item.date, '2026-02-31');
});

test('date helpers tolerate invalid imported dates without leaking Invalid Date', () => {
  assert.equal(app.daysFromToday('not-a-date'), 999);
  assert.equal(app.formatDate('2026-02-31'), 'No date');
  assert.equal(app.bumpDate('2026-04-30', 1), '2026-05-01');
});

test('clamp falls back instead of returning NaN for non-finite values', () => {
  assert.equal(app.clamp('not numeric', 1, 10, 6), 6);
  assert.equal(app.clamp(Number.NEGATIVE_INFINITY, 1, 10, 6), 6);
  assert.equal(app.clamp(14, 1, 10, 6), 10);
});

test('escapes imported habit text in every rendered summary panel', () => {
  const renderedPanels = [
    '[data-role="insights"]',
    '[data-role="list"]',
    '[data-role="editor"]',
    '[data-role="secondary-primary"]',
    '[data-role="secondary-secondary"]',
  ].map((selector) => elements.get(selector).innerHTML).join('\n');

  assert.equal(renderedPanels.includes('<img'), false);
  assert.equal(renderedPanels.includes('<script'), false);
  assert.equal(renderedPanels.includes('<svg'), false);
  assert.equal(renderedPanels.includes('<iframe'), false);
  assert.match(renderedPanels, /&lt;img src=x onerror=alert\(1\)&gt;Morning tide/);
  assert.match(renderedPanels, /Reset with &lt;iframe src=bad&gt;&lt;\/iframe&gt;/);
});
