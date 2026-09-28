(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Mastery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NUMS = [2, 3, 4, 5, 6, 7, 8, 9];
  const DAY = 24 * 60 * 60 * 1000;
  const TOTAL_FACTS = NUMS.length * NUMS.length;
  const STAGES = [
    [0, 'Первый шаг'],
    [20, 'Исследователь'],
    [40, 'Тренирующийся'],
    [60, 'Знаток умножения'],
    [80, 'Мастер таблицы'],
    [95, 'Эксперт'],
    [100, 'Таблица освоена'],
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function allKeys() {
    const keys = [];
    NUMS.forEach((a) => NUMS.forEach((b) => keys.push(a + 'x' + b)));
    return keys;
  }

  function freshness(lastAt, now) {
    if (!Number.isFinite(lastAt)) return 0.5; // старый прогресс сохраняется, но требует подтверждения
    const age = Math.max(0, now - lastAt);
    if (age <= 30 * DAY) return 1;
    if (age >= 90 * DAY) return 0;
    return 1 - (age - 30 * DAY) / (60 * DAY);
  }

  function factScore(stat, now) {
    if (!stat || !Number.isFinite(stat.n) || stat.n <= 0) return 0;
    const recent = Array.isArray(stat.last) ? stat.last.slice(-5) : [];
    const accuracy = recent.length
      ? recent.reduce((sum, value) => sum + (value ? 1 : 0), 0) / recent.length
      : clamp(1 - (Number(stat.err) || 0) / stat.n, 0, 1);
    const confidence = clamp(stat.n / 5, 0, 1);
    const avgT = Number(stat.avgT) || 0;
    const speed = avgT > 0 ? clamp((6000 - avgT) / 3500, 0, 1) : 0;
    const fresh = freshness(Number(stat.lastAt), now);
    return Math.round(100 * (0.5 * accuracy + 0.2 * confidence + 0.2 * speed + 0.1 * fresh));
  }

  function isMastered(stat, now) {
    if (!stat || stat.n < 5 || !Array.isArray(stat.last)) return false;
    const lastFive = stat.last.slice(-5);
    return lastFive.length === 5
      && lastFive.every(Boolean)
      && Number(stat.avgT) > 0
      && Number(stat.avgT) <= 2500
      && Number.isFinite(Number(stat.lastAt))
      && now - Number(stat.lastAt) <= 30 * DAY;
  }

  function stageFor(score) {
    let stage = STAGES[0][1];
    STAGES.forEach(([minimum, name]) => {
      if (score >= minimum) stage = name;
    });
    return stage;
  }

  function calculate(stats, now = Date.now()) {
    const source = stats && typeof stats === 'object' ? stats : {};
    const facts = allKeys().map((key) => {
      const stat = source[key];
      return { key, score: factScore(stat, now), mastered: isMastered(stat, now), seen: Boolean(stat && stat.n) };
    });
    const sorted = facts.slice().sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));
    const average = facts.reduce((sum, fact) => sum + fact.score, 0) / TOTAL_FACTS;
    const weakestAverage = sorted.slice(0, 8).reduce((sum, fact) => sum + fact.score, 0) / 8;
    const unseen = facts.filter((fact) => !fact.seen).length;
    const masteredCount = facts.filter((fact) => fact.mastered).length;
    let score = Math.round(average * 0.8 + weakestAverage * 0.2);

    // Один пробел не должен скрываться высоким средним баллом.
    if (unseen > 0) score = Math.min(score, 79);
    if (facts.some((fact) => fact.score < 50)) score = Math.min(score, 89);
    if (masteredCount < TOTAL_FACTS) score = Math.min(score, 99);

    const complete = masteredCount === TOTAL_FACTS && facts.every((fact) => fact.score === 100);
    if (complete) score = 100;

    return {
      score,
      stage: stageFor(score),
      masteredCount,
      total: TOTAL_FACTS,
      unseen,
      complete,
      weak: sorted.filter((fact) => !fact.mastered).slice(0, 5),
    };
  }

  return { NUMS, TOTAL_FACTS, factScore, isMastered, calculate, stageFor };
});
