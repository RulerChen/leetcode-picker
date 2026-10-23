import { slugsFromCompanyCsv } from './lib.js';

export const LC = 'https://leetcode.com';
const RATINGS_URL = 'https://zerotrac.github.io/leetcode_problem_rating/data.json';
const COMPANY_REPO = 'liquidslr/leetcode-company-wise-problems';

const DAY = 24 * 60 * 60 * 1000;
const STATUS_TTL = 5 * 60 * 1000;

export const PERIODS = {
  '30d': '1. Thirty Days',
  '3m': '2. Three Months',
  '6m': '3. Six Months',
  older: '4. More Than Six Months',
  all: '5. All',
};

// Serve from chrome.storage.local while fresh; on a failed refresh fall back to stale data.
async function cached(key, ttl, load) {
  const { [key]: entry } = await chrome.storage.local.get(key);
  if (entry && Date.now() - entry.at < ttl) return entry.data;
  try {
    const data = await load();
    await chrome.storage.local.set({ [key]: { at: Date.now(), data } });
    return data;
  } catch (e) {
    if (entry) return entry.data;
    throw e;
  }
}

async function fetchOk(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${new URL(url).host} returned ${res.status}`);
  return res;
}

// questionList caps every call at 100 rows, so page with aliases, 10 pages per request.
const PAGE = 100;
const PAGES_PER_REQUEST = 10;
const FIELDS = 'total:totalNum questions:data{slug:titleSlug difficulty paid:isPaidOnly likes topicTags{name slug}}';

async function graphql(query) {
  // The problem list is public; omit cookies so the request stays anonymous.
  const res = await fetchOk(`${LC}/graphql`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(`LeetCode GraphQL: ${body.errors[0].message}`);
  return body.data;
}

function pagesQuery(indices) {
  const parts = indices.map((i) => `p${i}:questionList(categorySlug:"",limit:${PAGE},skip:${i * PAGE},filters:{}){${FIELDS}}`);
  return `query{${parts.join(' ')}}`;
}

async function loadProblems() {
  const first = (await graphql(pagesQuery([0]))).p0;
  const rest = [];
  for (let i = 1; i < Math.ceil(first.total / PAGE); i++) rest.push(i);
  const chunks = [];
  for (let i = 0; i < rest.length; i += PAGES_PER_REQUEST) chunks.push(rest.slice(i, i + PAGES_PER_REQUEST));
  const results = await Promise.all(chunks.map((c) => graphql(pagesQuery(c))));

  const tags = {};
  const problems = [first, ...results.flatMap((r) => Object.values(r))]
    .flatMap((page) => page.questions)
    .map((q) => {
      for (const t of q.topicTags) tags[t.slug] = t.name;
      return {
        slug: q.slug,
        difficulty: q.difficulty,
        paid: q.paid,
        likes: q.likes,
        tags: q.topicTags.map((t) => t.slug),
      };
    });
  return { problems, tags };
}

async function loadRatings() {
  const rows = await (await fetchOk(RATINGS_URL)).json();
  return Object.fromEntries(rows.map((r) => [r.TitleSlug, Math.round(r.Rating)]));
}

async function loadCompanies() {
  const entries = await (await fetchOk(`https://api.github.com/repos/${COMPANY_REPO}/contents/`)).json();
  return entries.filter((e) => e.type === 'dir').map((e) => e.name);
}

export const getProblems = () => cached('problems:v2', DAY, loadProblems);
export const getRatings = () => cached('ratings', DAY, loadRatings);
export const getCompanies = () => cached('companies', DAY, loadCompanies);

export function getCompanyProblems(company, period) {
  const file = `${encodeURIComponent(company)}/${encodeURIComponent(`${PERIODS[period]}.csv`)}`;
  return cached(`company:${company}:${period}`, DAY, async () => {
    const text = await (await fetchOk(`https://raw.githubusercontent.com/${COMPANY_REPO}/main/${file}`)).text();
    return slugsFromCompanyCsv(text);
  });
}

// Sends the leetcode.com session cookie (not if third-party cookies are blocked); null when signed out.
export async function getSolved() {
  const { solved: entry } = await chrome.storage.local.get('solved');
  if (entry && Date.now() - entry.at < STATUS_TTL) return entry.data;
  const body = await (await fetchOk(`${LC}/api/problems/all/`, { credentials: 'include' })).json();
  if (!body.user_name) return null;
  const data = {};
  for (const p of body.stat_status_pairs) {
    if (p.status) data[p.stat.question__title_slug] = p.status;
  }
  await chrome.storage.local.set({ solved: { at: Date.now(), data } });
  return data;
}
