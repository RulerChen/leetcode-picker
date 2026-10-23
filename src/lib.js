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

// f.mode is 'rating' (rated problems in range) or 'difficulty'; ctx maps slugs to rating / 'ac' | 'notac', company is a Set or null.
export function filterProblems(problems, f, { ratings, solved, company }) {
  const tags = new Set(f.tags);
  return problems.filter((p) => {
    if (f.mode === 'difficulty') {
      if (!f.difficulty.includes(p.difficulty)) return false;
    } else {
      const r = ratings[p.slug];
      if (r == null || (f.ratingMin != null && r < f.ratingMin) || (f.ratingMax != null && r > f.ratingMax)) return false;
    }
    if (p.paid && !f.paid) return false;
    if (f.minLikes && p.likes < f.minLikes) return false;
    if (tags.size && !p.tags.some((t) => tags.has(t))) return false;
    if (company && !company.has(p.slug)) return false;
    if (f.status !== 'any') {
      const s = solved[p.slug] ?? 'todo';
      if (f.status === 'unsolved' ? s === 'ac' : s !== f.status) return false;
    }
    return true;
  });
}

// Rated problems per `step`-wide bucket from `lo`; out-of-range ratings land in the edge buckets.
export function histogram(problems, ratings, lo, hi, step) {
  const counts = new Array(Math.ceil((hi - lo) / step)).fill(0);
  for (const p of problems) {
    const r = ratings[p.slug];
    if (r != null) counts[Math.min(counts.length - 1, Math.max(0, Math.floor((r - lo) / step)))]++;
  }
  return counts;
}

export function pickRandom(list, random = Math.random) {
  return list.length ? list[Math.floor(random() * list.length)] : null;
}
