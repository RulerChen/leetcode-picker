# LeetCode Picker

Unofficial Chrome extension that opens a random LeetCode problem from the toolbar popup.

Filters: difficulty, contest rating, topics (match any), company and time window, your solve status, paid-only.
◀ / ▶ step through the problems picked this browser session.

## Data

- Problems and topics: leetcode.com GraphQL, cached 24 h.
- Solve status: leetcode.com `/api/problems/all/` with your session cookie, cached 5 min. Blocked third-party cookies break it.
- Rating: [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating), cached 24 h.
- Companies: [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems), fetched per company, cached 24 h. It has no license, so nothing is bundled.

Permissions: `storage`, plus `https://leetcode.com/*` for the problem list, solve status and reusing an open LeetCode tab.
No server and no analytics; data stays in `chrome.storage`.

## Development

Load the repo root as an unpacked extension at `chrome://extensions`.

```sh
npm test       # unit tests
npm run pack   # leetcode-picker.zip for the Chrome Web Store
```
