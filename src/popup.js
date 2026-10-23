import { filterProblems, histogram, pickRandom } from './lib.js';
import { LC, getProblems, getRatings, getCompanies, getCompanyProblems, getSolved } from './data.js';

const RATING_LO = 1000;
const RATING_HI = 3200;
const BUCKET = 100;
const LEVELS = ['Easy', 'Medium', 'Hard'];

const DEFAULT_FILTERS = {
  mode: 'rating',
  difficulty: LEVELS,
  ratingMin: 1500,
  ratingMax: null,
  tags: [],
  company: '',
  period: 'all',
  status: 'any',
  paid: false,
};

const $ = (id) => document.getElementById(id);
const form = $('filters');

// Data fields: undefined while loading, Error if it failed, else the data; solved is null when signed out.
const state = {
  filters: DEFAULT_FILTERS,
  history: { list: [], index: -1 },
  problems: undefined,
  tagNames: {},
  bySlug: new Map(),
  ratings: undefined,
  companies: [],
  company: undefined,
  solved: undefined,
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
    (f.company && blocker(state.company, `${f.company} problems`));
  if (block) return { block };
  const list = filterProblems(state.problems, f, {
    ratings: loaded(state.ratings) ?? {},
    solved: loaded(state.solved) ?? {},
    company: f.company ? state.company : null,
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
  form.elements.ratingMin.classList.toggle('top', lo > (RATING_LO + RATING_HI) / 2);
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
    form.querySelector(`b[data-level="${level}"]`).textContent = n ?? '…';
  }
}

function render() {
  if (state.filters.mode === 'rating') renderRating();
  else renderLevels();
  const { block, list } = candidates();
  const count = $('count');
  if (block) {
    count.textContent = block;
  } else {
    const n = document.createElement('strong');
    n.textContent = list.length;
    count.replaceChildren(n, ` problem${list.length === 1 ? '' : 's'} match`);
  }
  $('pick').disabled = Boolean(block) || list.length === 0;
}

function renderCurrent() {
  const h = state.history;
  const slug = h.list[h.index];
  $('prev').disabled = h.index <= 0;
  $('next').disabled = h.index >= h.list.length - 1;
  const el = $('current');
  el.hidden = !slug;
  if (!slug) return;
  const p = state.bySlug.get(slug);
  const rating = loaded(state.ratings)?.[slug];
  el.href = `${LC}/problems/${slug}/`;
  const badge = el.querySelector('.badge');
  badge.hidden = rating == null;
  badge.textContent = rating ?? '';
  el.querySelector('.title').textContent = p ? `${p.id}. ${p.title}` : slug;
  const meta = el.querySelector('.meta');
  meta.replaceChildren();
  if (p) {
    const d = document.createElement('span');
    d.className = p.difficulty;
    d.textContent = p.difficulty;
    meta.append(d, ' · ');
  }
  meta.append(`${h.index + 1} / ${h.list.length}`);
}

function renderTopicSummary() {
  const tags = state.filters.tags;
  $('topicSummary').textContent = tags.length ? tags.map((t) => state.tagNames[t] ?? t).join(', ') : 'Any';
}

function buildTopics(tagNames) {
  const selected = new Set(state.filters.tags);
  const labels = Object.entries(tagNames)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([slug, name]) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'tag';
      input.value = slug;
      input.checked = selected.has(slug);
      label.append(input, name);
      return label;
    });
  const empty = document.createElement('span');
  empty.className = 'empty';
  empty.textContent = 'No topics match';
  empty.hidden = true;
  $('topicList').replaceChildren(...labels, empty);
  filterTopics();
}

function filterTopics() {
  const q = $('topicSearch').value.trim().toLowerCase();
  let shown = 0;
  for (const label of $('topicList').querySelectorAll('label')) {
    label.hidden = Boolean(q) && !label.textContent.toLowerCase().includes(q);
    if (!label.hidden) shown++;
  }
  const empty = $('topicList').querySelector('.empty');
  if (empty) empty.hidden = shown > 0;
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
    company: fd.get('company').trim(),
    period: fd.get('period'),
    status: fd.get('status'),
    paid: fd.has('paid'),
  };
}

function writeForm(f) {
  for (const el of form.elements) {
    if (!el.name || el.name === 'tag') continue;
    if (el.name === 'ratingMin') el.value = f.ratingMin ?? RATING_LO;
    else if (el.name === 'ratingMax') el.value = f.ratingMax ?? RATING_HI;
    else if (el.type === 'radio') el.checked = f[el.name] === el.value;
    else if (el.type === 'checkbox') {
      el.checked = el.name === 'difficulty' ? f.difficulty.includes(el.value) : Boolean(f[el.name]);
    } else el.value = f[el.name] ?? '';
  }
}

// Company combobox: filter as you type, arrows and Enter to choose, Escape to close.
const companyInput = form.elements.company;
const companyMenu = $('companyMenu');
let companyActive = 0;

function companyOption(name, q, i) {
  const li = document.createElement('li');
  li.id = `company-${i}`;
  li.setAttribute('role', 'option');
  li.dataset.value = name;
  if (!name) {
    li.className = 'any';
    li.textContent = 'Any company';
  } else if (q) {
    const at = name.toLowerCase().indexOf(q);
    const mark = document.createElement('mark');
    mark.textContent = name.slice(at, at + q.length);
    li.append(name.slice(0, at), mark, name.slice(at + q.length));
  } else {
    li.textContent = name;
  }
  return li;
}

function openCompanyMenu() {
  const q = companyInput.value.trim().toLowerCase();
  const names = state.companies.filter((n) => n.toLowerCase().includes(q));
  const items = (q ? names : ['', ...names]).map((n, i) => companyOption(n, q, i));
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = state.companies.length ? 'No company matches' : 'Company list unavailable';
    items.push(li);
  }
  companyMenu.replaceChildren(...items);
  companyMenu.hidden = false;
  companyInput.setAttribute('aria-expanded', 'true');
  setCompanyActive(0);
}

function closeCompanyMenu() {
  companyMenu.hidden = true;
  companyInput.setAttribute('aria-expanded', 'false');
  companyInput.removeAttribute('aria-activedescendant');
}

function setCompanyActive(i) {
  const options = companyMenu.querySelectorAll('[role=option]');
  if (!options.length) return;
  companyActive = (i + options.length) % options.length;
  options.forEach((o, j) => o.setAttribute('aria-selected', String(j === companyActive)));
  options[companyActive].scrollIntoView({ block: 'nearest' });
  companyInput.setAttribute('aria-activedescendant', options[companyActive].id);
}

function chooseCompany(name) {
  companyInput.value = name;
  closeCompanyMenu();
  companyInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function setupCompanyCombo() {
  companyInput.addEventListener('focus', openCompanyMenu);
  companyInput.addEventListener('input', openCompanyMenu);
  companyInput.addEventListener('blur', closeCompanyMenu);
  companyInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (companyMenu.hidden) openCompanyMenu();
      else setCompanyActive(companyActive + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = companyMenu.hidden ? null : companyMenu.querySelectorAll('[role=option]')[companyActive];
      if (option) chooseCompany(option.dataset.value);
    } else if (e.key === 'Escape' && !companyMenu.hidden) {
      e.preventDefault();
      closeCompanyMenu();
    }
  });
  // mousedown keeps focus in the input so blur does not close the menu first.
  companyMenu.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const option = e.target.closest('[role=option]');
    if (option) chooseCompany(option.dataset.value);
  });
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

let companiesLoad = null;
let companyToken = 0;
async function loadCompany() {
  const token = ++companyToken;
  const { company, period } = state.filters;
  state.company = undefined;
  if (!company) return;
  render();
  const names = await companiesLoad.catch(() => null);
  // Without the company list we cannot canonicalize, so try the name as typed.
  const name = names ? names.find((n) => n.toLowerCase() === company.toLowerCase()) : company;
  let result;
  if (!name) {
    result = new Error(`No company named "${company}" in the dataset.`);
  } else {
    try {
      result = new Set(await getCompanyProblems(name, period));
    } catch (e) {
      result = new Error(`Could not load ${name} problems (${e.message}).`);
    }
  }
  if (token !== companyToken) return;
  if (name && name !== company) {
    companyInput.value = name;
    state.filters.company = name;
    saveFilters();
  }
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
  if (state.filters.company !== prev.company || state.filters.period !== prev.period) loadCompany();
  renderTopicSummary();
  render();
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

async function saveHistory() {
  await chrome.storage.session.set({ history: state.history });
  renderCurrent();
}

async function pick() {
  const { list } = candidates();
  const h = state.history;
  const p = list && pickRandom(list, h.list[h.index]);
  if (!p) return;
  h.list = h.list.slice(0, h.index + 1);
  h.list.push(p.slug);
  h.index = h.list.length - 1;
  await saveHistory();
  await openProblem(p.slug);
}

async function step(delta) {
  const h = state.history;
  const i = h.index + delta;
  if (i < 0 || i >= h.list.length) return;
  h.index = i;
  await saveHistory();
  await openProblem(h.list[i]);
}

async function init() {
  const [{ filters }, { history }] = await Promise.all([
    chrome.storage.local.get('filters'),
    chrome.storage.session.get('history'),
  ]);
  state.filters = { ...DEFAULT_FILTERS, ...filters };
  if (history) state.history = history;
  buildRatingScale();
  writeForm(state.filters);
  renderTopicSummary();
  render();
  renderCurrent();

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', onRatingInput);
  form.addEventListener('change', onChange);
  setupCompanyCombo();
  $('topicSearch').addEventListener('input', filterTopics);
  $('clearTopics').addEventListener('click', () => {
    for (const el of $('topicList').querySelectorAll('input')) el.checked = false;
    onChange();
  });
  $('pick').addEventListener('click', pick);
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('current').addEventListener('click', (e) => {
    e.preventDefault();
    openProblem(state.history.list[state.history.index]);
  });

  companiesLoad = getCompanies();
  companiesLoad.then(
    (names) => {
      state.companies = names;
      if (document.activeElement === companyInput) openCompanyMenu();
    },
    () => {},
  );

  getProblems()
    .then(
      ({ problems, tags }) => {
        state.problems = problems;
        state.tagNames = tags;
        state.bySlug = new Map(problems.map((p) => [p.slug, p]));
        buildTopics(tags);
      },
      (e) => { state.problems = new Error(`Could not load the problem list (${e.message}).`); },
    )
    .then(() => { renderTopicSummary(); render(); renderCurrent(); });

  getRatings()
    .then(
      (r) => { state.ratings = r; },
      (e) => { state.ratings = new Error(`Could not load ratings (${e.message}).`); },
    )
    .then(() => { render(); renderCurrent(); });

  if (state.filters.status !== 'any') ensureSolved();
  if (state.filters.company) loadCompany();
}

init();
