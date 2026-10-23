import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, slugsFromCompanyCsv, filterProblems, histogram, pickRandom } from '../src/lib.js';

test('parseCsv handles quoted commas, escaped quotes and CRLF', () => {
  const text = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n2,,"multi\nline"\n';
  assert.deepEqual(parseCsv(text), [
    ['a', 'b', 'c'],
    ['1', 'x, y', 'say "hi"'],
    ['2', '', 'multi\nline'],
  ]);
});

test('slugsFromCompanyCsv reads the Link column by header name', () => {
  const text = [
    'Difficulty,Title,Frequency,Acceptance Rate,Link,Topics',
    'EASY,Two Sum,100.0,0.5,https://leetcode.com/problems/two-sum,"Array, Hash Table"',
    'HARD,"Median, of Two",74.3,0.4,https://leetcode.com/problems/median-of-two-sorted-arrays/,"Array"',
  ].join('\n');
  assert.deepEqual(slugsFromCompanyCsv(text), ['two-sum', 'median-of-two-sorted-arrays']);
});

const P = (slug, difficulty, tags = [], paid = false) => ({ slug, difficulty, tags, paid });
const problems = [
  P('a', 'Easy', ['array']),
  P('b', 'Medium', ['dp']),
  P('c', 'Hard', ['dp', 'graph']),
  P('d', 'Medium', ['graph'], true),
  P('e', 'Hard', ['math']),
];
const base = {
  mode: 'difficulty',
  difficulty: ['Easy', 'Medium', 'Hard'],
  ratingMin: null,
  ratingMax: null,
  tags: [],
  status: 'any',
  paid: false,
};
const ctx = { ratings: { a: 1200, b: 1700, c: 2300 }, solved: { a: 'ac', b: 'notac' }, company: null };
const run = (f, c = ctx) => filterProblems(problems, { ...base, ...f }, c).map((p) => p.slug);

test('filterProblems: difficulty and paid', () => {
  assert.deepEqual(run({}), ['a', 'b', 'c', 'e']);
  assert.deepEqual(run({ paid: true, difficulty: ['Medium'] }), ['b', 'd']);
});

test('filterProblems: topics match any selected tag', () => {
  assert.deepEqual(run({ tags: ['dp', 'graph'], paid: true }), ['b', 'c', 'd']);
});

test('filterProblems: rating mode ignores difficulty and needs a rating', () => {
  assert.deepEqual(run({ mode: 'rating', ratingMin: 1500, ratingMax: 2000 }), ['b']);
  assert.deepEqual(run({ mode: 'rating', ratingMin: 1500, difficulty: ['Easy'] }), ['b', 'c']);
  assert.deepEqual(run({ mode: 'rating' }), ['a', 'b', 'c']);
});

test('filterProblems: difficulty mode ignores rating and keeps unrated problems', () => {
  assert.deepEqual(run({ difficulty: ['Hard'], ratingMin: 2500 }), ['c', 'e']);
});

test('histogram buckets rated problems and clamps outliers to the edges', () => {
  const ratings = { a: 1200, b: 1700, c: 2300, x: 900, y: 3500 };
  const list = [...problems, P('x', 'Easy'), P('y', 'Hard')];
  assert.deepEqual(histogram(list, ratings, 1000, 3200, 500), [2, 1, 1, 0, 1]);
});

test('filterProblems: solve status', () => {
  assert.deepEqual(run({ status: 'ac' }), ['a']);
  assert.deepEqual(run({ status: 'notac' }), ['b']);
  assert.deepEqual(run({ status: 'todo' }), ['c', 'e']);
  assert.deepEqual(run({ status: 'unsolved' }), ['b', 'c', 'e']);
});

test('filterProblems: minimum likes', () => {
  const liked = problems.map((p, i) => ({ ...p, likes: [5000, 800, 1200, 20000, 0][i] }));
  const slugs = (f) => filterProblems(liked, { ...base, ...f }, ctx).map((p) => p.slug);
  assert.deepEqual(slugs({ minLikes: 1000 }), ['a', 'c']);
  assert.deepEqual(slugs({ minLikes: 0 }), ['a', 'b', 'c', 'e']);
});

test('filterProblems: company set', () => {
  assert.deepEqual(run({}, { ...ctx, company: new Set(['c', 'd', 'zzz']) }), ['c']);
});

test('pickRandom picks uniformly and returns null for an empty list', () => {
  const list = [P('a'), P('b')];
  assert.equal(pickRandom(list, () => 0).slug, 'a');
  assert.equal(pickRandom(list, () => 0.99).slug, 'b');
  assert.equal(pickRandom([]), null);
});
