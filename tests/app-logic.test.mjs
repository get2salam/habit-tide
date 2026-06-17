import assert from 'node:assert/strict';
import test from 'node:test';

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
  querySelector: stubElement,
};

globalThis.localStorage = {
  getItem() { return null; },
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
