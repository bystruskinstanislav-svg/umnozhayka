const test = require('node:test');
const assert = require('node:assert/strict');
const Mastery = require('../mastery.js');

const NOW = Date.UTC(2026, 8, 28);
const keys = () => Mastery.NUMS.flatMap((a) => Mastery.NUMS.map((b) => a + 'x' + b));
const perfect = (lastAt = NOW) => ({ n: 5, err: 0, last: [1, 1, 1, 1, 1], avgT: 2000, lastAt });
const full = (factory = () => perfect()) => Object.fromEntries(keys().map((key) => [key, factory(key)]));

test('new learner starts at zero with all facts unseen', () => {
  const result = Mastery.calculate({}, NOW);
  assert.equal(result.score, 0);
  assert.equal(result.unseen, 64);
  assert.equal(result.masteredCount, 0);
  assert.equal(result.complete, false);
});

test('a few perfect answers cannot produce a misleading high rating', () => {
  const result = Mastery.calculate({ '7x8': perfect() }, NOW);
  assert.ok(result.score < 10);
  assert.equal(result.unseen, 63);
});

test('100 points requires fresh, fast and error-free proof for all 64 facts', () => {
  const result = Mastery.calculate(full(), NOW);
  assert.equal(result.score, 100);
  assert.equal(result.masteredCount, 64);
  assert.equal(result.complete, true);
  assert.equal(result.stage, 'Таблица освоена');
});

test('one uncertain fact prevents a perfect rating', () => {
  const stats = full();
  stats['7x8'] = { n: 5, err: 1, last: [1, 1, 0, 1, 1], avgT: 2000, lastAt: NOW };
  const result = Mastery.calculate(stats, NOW);
  assert.ok(result.score < 100);
  assert.equal(result.complete, false);
  assert.ok(result.weak.some((fact) => fact.key === '7x8'));
});

test('knowledge older than 90 days needs confirmation', () => {
  const result = Mastery.calculate(full(() => perfect(NOW - 91 * 24 * 60 * 60 * 1000)), NOW);
  assert.ok(result.score < 100);
  assert.equal(result.masteredCount, 0);
  assert.equal(result.complete, false);
});

test('slow answers do not count as fully mastered', () => {
  const result = Mastery.calculate(full(() => ({ ...perfect(), avgT: 4200 })), NOW);
  assert.ok(result.score < 100);
  assert.equal(result.masteredCount, 0);
});
