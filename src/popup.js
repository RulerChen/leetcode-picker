import { filterProblems, histogram, pickRandom } from './lib.js';
import { LC, getProblems, getRatings, getCompanies, getCompanyProblems, getSolved, getPremium } from './data.js';

const RATING_LO = 1000;
const RATING_HI = 3200;
const BUCKET = 100;
const LEVELS = ['Easy', 'Medium', 'Hard'];
// Coding-interview topics; contest-only tags such as network flow, suffix automaton or Sprague-Grundy are not listed.
const TOPICS = new Set([
  'array', 'string', 'hash-table', 'hash-function', 'counting', 'two-pointers', 'sliding-window', 'prefix-sum',
  'stack', 'monotonic-stack', 'queue', 'monotonic-queue', 'bracket-sequences', 'linked-list', 'doubly-linked-list',
  'binary-search', 'sorting', 'merge-sort', 'quickselect', 'counting-sort', 'bucket-sort',
  'tree', 'binary-tree', 'binary-search-tree', 'lowest-common-ancestor', 'trie', 'heap-priority-queue',
  'ordered-set', 'segment-tree', 'binary-indexed-tree', 'iterator', 'data-stream', 'design',
  'depth-first-search', 'breadth-first-search', 'graph', 'topological-sort', 'union-find', 'bipartite-graph',
  'shortest-path', 'dijkstra', 'minimum-spanning-tree', 'eulerian-circuit',
  'recursion', 'backtracking', 'memoization', 'dynamic-programming', 'knapsack-problem',
  'longest-increasing-subsequence', 'longest-common-subsequence', 'dp-on-trees', 'bitmask',
  'greedy', 'divide-and-conquer', 'sweep-line', 'simulation',
  'string-matching', 'knuth-morris-pratt-algorithm', 'rolling-hash',
  'floyds-cycle-finding-algorithm', 'boyer-moore-majority-vote-algorithm', 'randomized', 'reservoir-sampling',
  'bit-manipulation', 'math', 'number-theory', 'combinatorics', 'geometry', 'probability-and-statistics',
  'game-theory', 'brainteaser', 'matrix', 'interactive', 'concurrency', 'database',
]);

const DEFAULT_FILTERS = {
  mode: 'rating',
  difficulty: LEVELS,
  ratingMin: 1500,
  ratingMax: null,
  tags: [],
  companies: [],
  period: 'all',
  status: 'any',
  minLikes: 0,
};

const $ = (id) => document.getElementById(id);
const form = $('filters');

// Data fields: undefined while loading, Error if it failed, else the data; solved is null when signed out.
const state = {
  filters: DEFAULT_FILTERS,
  problems: undefined,
  tagNames: {},
  ratings: undefined,
  company: undefined,
  solved: undefined,
  premium: false,
};

const loaded = (v) => (v === undefined || v instanceof Error ? null : v);

function blocker(value, what) {
  if (value === undefined) return `Loading ${what}…`;
  if (value instanceof Error) return value.message;
  return null;
}

function candidates(f = state.filters) {
  const block =
    blocker(state.problems, 'problem list') ||
    (f.mode === 'rating' && blocker(state.ratings, 'ratings')) ||
    (f.status !== 'any' &&
      (blocker(state.solved, 'solve status') ||
        (state.solved === null && 'Sign in to leetcode.com to filter by solve status.'))) ||
    (f.companies.length && blocker(state.company, 'company problems'));
  if (block) return { block };
  const list = filterProblems(state.problems, { ...f, paid: state.premium }, {
    ratings: loaded(state.ratings) ?? {},
    solved: loaded(state.solved) ?? {},
    company: f.companies.length ? state.company : null,
  });
  return { list };
}

function renderRating() {
  const f = state.filters;
  const lo = f.ratingMin ?? RATING_LO;
  const hi = f.ratingMax ?? RATING_HI;
  const range = $('range');
  range.style.setProperty('--lo', (lo - RATING_LO) / (RATING_HI - RATING_LO));
  range.style.setProperty('--hi', (hi - RATING_LO) / (RATING_HI - RATING_LO));
  $('ratingLabel').textContent = `${lo} – ${f.ratingMax == null ? `${RATING_HI}+` : hi}`;

  const { list } = candidates({ ...f, ratingMin: null, ratingMax: null });
  const bars = $('hist').children;
  const counts = list ? histogram(list, state.ratings, RATING_LO, RATING_HI, BUCKET) : [];
  const peak = Math.max(1, ...counts);
  for (let i = 0; i < bars.length; i++) {
    const from = RATING_LO + i * BUCKET;
    const n = counts[i] ?? 0;
    bars[i].style.transform = `scaleY(${Math.max(0.04, n / peak)})`;
    bars[i].classList.toggle('in', from + BUCKET > lo && (f.ratingMax == null || from <= hi));
    bars[i].title = `${from}–${from + BUCKET - 1}: ${n}`;
  }
}

function renderLevels() {
  const { list } = candidates({ ...state.filters, difficulty: LEVELS });
  for (const level of LEVELS) {
    const n = list?.filter((p) => p.difficulty === level).length;
    form.querySelector(`b[data-level="${level}"]`).textContent = n == null ? '…' : `${n} problems`;
  }
}

function render() {
  if (state.filters.mode === 'rating') renderRating();
  else renderLevels();
  const { block, list } = candidates();
  const count = $('count');
  count.title = block ?? '';
  if (block) {
    count.textContent = block;
  } else {
    const n = document.createElement('strong');
    n.textContent = list.length;
    count.replaceChildren(n, ` problem${list.length === 1 ? '' : 's'} match`);
  }
  $('pick').disabled = Boolean(block) || list.length === 0;
}

function renderSummaries() {
  const { tags, companies } = state.filters;
  $('topicSummary').textContent = tags.length ? tags.map((t) => state.tagNames[t] ?? t).join(', ') : 'Any';
  $('companySummary').textContent = companies.length ? companies.join(', ') : 'Any';
}

// Selected values are always listed, so they survive a list that is loading, failed or dropped them.
function buildChips(list, name, entries, selected, note) {
  const labels = entries
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, text]) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = name;
      input.value = value;
      input.checked = selected.includes(value);
      label.append(input, text);
      return label;
    });
  const empty = document.createElement('span');
  empty.className = 'empty';
  empty.textContent = note;
  list.replaceChildren(...labels, empty);
  filterChips(list);
}

function buildTopics(note = 'No topics match') {
  const { tags } = state.filters;
  const slugs = new Set([...Object.keys(state.tagNames).filter((s) => TOPICS.has(s)), ...tags]);
  buildChips($('topicList'), 'tag', [...slugs].map((s) => [s, state.tagNames[s] ?? s]), tags, note);
}

function buildCompanies(names, note = 'No companies match') {
  const { companies } = state.filters;
  buildChips($('companyList'), 'company', [...new Set([...names, ...companies])].map((n) => [n, n]), companies, note);
}

function filterChips(list) {
  const q = list.parentElement.querySelector('[type=search]').value.trim().toLowerCase();
  let shown = 0;
  for (const label of list.querySelectorAll('label')) {
    label.hidden = Boolean(q) && !label.textContent.toLowerCase().includes(q);
    if (!label.hidden) shown++;
  }
  list.querySelector('.empty').hidden = shown > 0;
}

function buildRatingScale() {
  const pct = (v) => `${((v - RATING_LO) / (RATING_HI - RATING_LO)) * 100}%`;
  const ticks = [];
  for (let v = RATING_LO; v < RATING_HI; v += 500) {
    const t = document.createElement('span');
    t.style.left = pct(v);
    t.textContent = v;
    ticks.push(t);
  }
  $('ticks').replaceChildren(...ticks);
  const bars = [];
  for (let from = RATING_LO; from < RATING_HI; from += BUCKET) bars.push(document.createElement('span'));
  $('hist').replaceChildren(...bars);
}

function readForm() {
  const fd = new FormData(form);
  const min = Number(fd.get('ratingMin'));
  const max = Number(fd.get('ratingMax'));
  return {
    mode: fd.get('mode'),
    difficulty: fd.getAll('difficulty'),
    ratingMin: min <= RATING_LO ? null : min,
    ratingMax: max >= RATING_HI ? null : max,
    tags: fd.getAll('tag'),
    companies: fd.getAll('company'),
    period: fd.get('period'),
    status: fd.get('status'),
    minLikes: Number(fd.get('minLikes')),
  };
}

function writeForm(f) {
  for (const el of form.elements) {
    if (!el.name || el.name === 'tag' || el.name === 'company') continue;
    if (el.name === 'ratingMin') el.value = f.ratingMin ?? RATING_LO;
    else if (el.name === 'ratingMax') el.value = f.ratingMax ?? RATING_HI;
    else if (el.type === 'radio') el.checked = String(f[el.name]) === el.value;
    else if (el.type === 'checkbox') el.checked = f.difficulty.includes(el.value);
    else el.value = f[el.name] ?? '';
  }
}

let solvedLoad = null;
function ensureSolved() {
  solvedLoad ??= getSolved()
    .then(
      (v) => { state.solved = v; },
      (e) => { state.solved = new Error(`Could not load solve status (${e.message}).`); },
    )
    .then(() => { render(); });
}

let companyToken = 0;
async function loadCompany() {
  const token = ++companyToken;
  const { companies, period } = state.filters;
  state.company = undefined;
  if (!companies.length) return;
  render();
  let result;
  try {
    const lists = await Promise.all(companies.map((c) =>
      getCompanyProblems(c, period).catch((e) => { throw new Error(`Could not load ${c} problems (${e.message}).`); })));
    result = new Set(lists.flat());
  } catch (e) {
    result = e;
  }
  if (token !== companyToken) return;
  state.company = result;
  render();
}

function saveFilters() {
  chrome.storage.local.set({ filters: state.filters });
}

function onChange() {
  const prev = state.filters;
  state.filters = readForm();
  saveFilters();
  if (state.filters.status !== 'any') ensureSolved();
  if (String(state.filters.companies) !== String(prev.companies) || state.filters.period !== prev.period) loadCompany();
  if (state.filters.mode !== prev.mode) {
    const easing = getComputedStyle(form).getPropertyValue('--ease-out');
    form.querySelector(`.${state.filters.mode}-panel`).animate({ opacity: [0, 1] }, { duration: 200, easing });
  }
  renderSummaries();
  render();
}

// Moves the nearest thumb; when both are equally near, the first movement's direction decides.
function setupRangeDrag() {
  const range = $('range');
  const { ratingMin: min, ratingMax: max } = form.elements;
  const step = Number(min.step);
  let active = null;
  let startX = 0;

  const valueAt = (clientX) => {
    const r = range.getBoundingClientRect();
    const thumb = range.querySelector('.thumb').offsetWidth;
    const t = Math.min(1, Math.max(0, (clientX - r.left - thumb / 2) / (r.width - thumb)));
    return RATING_LO + Math.round((t * (RATING_HI - RATING_LO)) / step) * step;
  };
  const moveTo = (v) => {
    active.value = active === min ? Math.min(v, Number(max.value)) : Math.max(v, Number(min.value));
    active.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const activate = (input) => {
    active = input;
    input.focus({ preventScroll: true });
    range.querySelector(`[data-for="${input.name}"]`).classList.add('dragging');
  };

  range.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    range.setPointerCapture(e.pointerId);
    startX = e.clientX;
    const v = valueAt(e.clientX);
    const dMin = Math.abs(v - Number(min.value));
    const dMax = Math.abs(v - Number(max.value));
    if (dMin !== dMax) {
      activate(dMin < dMax ? min : max);
      moveTo(v);
    }
  });
  range.addEventListener('pointermove', (e) => {
    if (!range.hasPointerCapture(e.pointerId)) return;
    if (!active) {
      if (e.clientX === startX) return;
      activate(e.clientX < startX ? min : max);
    }
    moveTo(valueAt(e.clientX));
  });
  const end = () => {
    if (!active) return;
    range.querySelector('.dragging')?.classList.remove('dragging');
    active.dispatchEvent(new Event('change', { bubbles: true }));
    active = null;
  };
  range.addEventListener('pointerup', end);
  range.addEventListener('pointercancel', end);
}

// Live feedback while dragging; the change event that follows saves the filters.
function onRatingInput(e) {
  if (e.target.type !== 'range') return;
  const { ratingMin: min, ratingMax: max } = form.elements;
  if (Number(min.value) > Number(max.value)) {
    if (e.target === min) min.value = max.value;
    else max.value = min.value;
  }
  state.filters = readForm();
  render();
}

async function openProblem(slug) {
  const url = `${LC}/problems/${slug}/`;
  // tab.url is only visible for hosts we have permission for, i.e. leetcode.com.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith(`${LC}/`)) await chrome.tabs.update(tab.id, { url });
  else await chrome.tabs.create({ url });
}

function pick() {
  const p = pickRandom(candidates().list ?? []);
  if (p) openProblem(p.slug);
}

async function init() {
  // Caches written by earlier versions.
  chrome.storage.local.remove(['problems', 'companyCounts']);
  const { filters } = await chrome.storage.local.get('filters');
  state.filters = { ...DEFAULT_FILTERS, ...filters };
  buildRatingScale();
  writeForm(state.filters);
  buildTopics('Loading topics…');
  buildCompanies([], 'Loading companies…');
  renderSummaries();
  render();

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', onRatingInput);
  form.addEventListener('change', onChange);
  setupRangeDrag();
  for (const list of [$('topicList'), $('companyList')]) {
    list.parentElement.querySelector('[type=search]').addEventListener('input', () => filterChips(list));
    list.parentElement.querySelector('.link').addEventListener('click', () => {
      for (const el of list.querySelectorAll('input')) el.checked = false;
      onChange();
    });
  }
  $('pick').addEventListener('click', pick);

  getProblems()
    .then(
      ({ problems, tags }) => {
        state.problems = problems;
        state.tagNames = tags;
        buildTopics();
      },
      (e) => {
        state.problems = new Error(`Could not load the problem list (${e.message}).`);
        buildTopics(state.problems.message);
      },
    )
    .then(() => { renderSummaries(); render(); });

  getCompanies().then(
    (names) => buildCompanies(names),
    (e) => buildCompanies([], `Could not load companies (${e.message}).`),
  );

  getRatings()
    .then(
      (r) => { state.ratings = r; },
      (e) => { state.ratings = new Error(`Could not load ratings (${e.message}).`); },
    )
    .then(() => { render(); });

  // Paid-only problems are listed only for a Premium account; a failed check counts as no Premium.
  getPremium().then((v) => { state.premium = v; render(); }, () => {});

  if (state.filters.status !== 'any') ensureSolved();
  if (state.filters.companies.length) loadCompany();
}

init();
