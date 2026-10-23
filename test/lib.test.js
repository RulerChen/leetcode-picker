import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, slugsFromCompanyCsv, filterProblems, pickRandom } from '../src/lib.js';

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
  difficulty: ['Easy', 'Medium', 'Hard'],
  ratingMin: null,
  ratingMax: null,
  includeUnrated: false,
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

test('filterProblems: rating range and unrated problems', () => {
  assert.deepEqual(run({ ratingMin: 1500, ratingMax: 2000 }), ['b']);
  assert.deepEqual(run({ ratingMin: 1500 }), ['b', 'c']);
  assert.deepEqual(run({ ratingMin: 1500, includeUnrated: true }), ['b', 'c', 'e']);
  // includeUnrated alone does not restrict anything.
  assert.deepEqual(run({ includeUnrated: true }), ['a', 'b', 'c', 'e']);
});

test('filterProblems: solve status', () => {
  assert.deepEqual(run({ status: 'ac' }), ['a']);
  assert.deepEqual(run({ status: 'notac' }), ['b']);
  assert.deepEqual(run({ status: 'todo' }), ['c', 'e']);
  assert.deepEqual(run({ status: 'unsolved' }), ['b', 'c', 'e']);
});

test('filterProblems: company set', () => {
  assert.deepEqual(run({}, { ...ctx, company: new Set(['c', 'd', 'zzz']) }), ['c']);
});

test('pickRandom skips the current problem unless it is the only one', () => {
  const list = [P('a'), P('b')];
  assert.equal(pickRandom(list, 'a', () => 0).slug, 'b');
  assert.equal(pickRandom([P('a')], 'a', () => 0.9).slug, 'a');
  assert.equal(pickRandom([], 'a'), null);
});
