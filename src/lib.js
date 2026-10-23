// Pure logic shared by the popup and the tests. No chrome.* here.

// Minimal RFC 4180 parser: quoted fields may contain commas, newlines and "" escapes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Company CSVs link to https://leetcode.com/problems/<slug>; return the slugs.
export function slugsFromCompanyCsv(text) {
  const [header, ...rows] = parseCsv(text);
  const link = header.indexOf('Link');
  if (link < 0) throw new Error('company CSV has no Link column');
  return rows
    .map((r) => r[link]?.match(/\/problems\/([^/?#]+)/)?.[1])
    .filter(Boolean);
}

// ctx: ratings slug -> rating, solved slug -> 'ac' | 'notac', company Set of slugs or null.
export function filterProblems(problems, f, { ratings, solved, company }) {
  const tags = new Set(f.tags);
  const ranged = f.ratingMin != null || f.ratingMax != null;
  return problems.filter((p) => {
    if (!f.difficulty.includes(p.difficulty)) return false;
    if (p.paid && !f.paid) return false;
    if (tags.size && !p.tags.some((t) => tags.has(t))) return false;
    if (company && !company.has(p.slug)) return false;
    if (ranged) {
      const r = ratings[p.slug];
      if (r == null) {
        if (!f.includeUnrated) return false;
      } else if ((f.ratingMin != null && r < f.ratingMin) || (f.ratingMax != null && r > f.ratingMax)) {
        return false;
      }
    }
    if (f.status !== 'any') {
      const s = solved[p.slug] ?? 'todo';
      if (f.status === 'unsolved' ? s === 'ac' : s !== f.status) return false;
    }
    return true;
  });
}

// Avoid handing back the problem the user is already looking at.
export function pickRandom(list, currentSlug, random = Math.random) {
  const pool = list.length > 1 ? list.filter((p) => p.slug !== currentSlug) : list;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}
