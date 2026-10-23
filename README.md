# LeetCode Picker

Unofficial Chrome extension that opens a random LeetCode problem from the toolbar popup.

Search by rating or by difficulty, one at a time. Rating (default) is a contest-rating range, 1500+ to start,
over a histogram of matching problems; only contest problems have one.
Other filters: searchable topics and companies (each matches any selected), a time window for companies,
your solve status, and minimum likes (1k+, 3k+, 5k+) for well-known problems; newer contest problems have fewer likes.
Paid-only problems are listed only when your leetcode.com account has Premium.
The topic list leaves out contest-only tags such as network flow or suffix automaton; every company in the dataset is listed.

## Data

- Problems, topics and likes: leetcode.com GraphQL, cached 24 h.
- Solve status: leetcode.com `/api/problems/all/` with your session cookie, cached 5 min. Blocked third-party cookies break it.
- Premium: leetcode.com GraphQL `userStatus` by GET with the same cookie, cached 5 min; signed out counts as no Premium.
- Rating: [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating), cached 24 h.
- Companies: [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems), fetched per company, cached 24 h. It has no license, so nothing is bundled.

Permissions: `storage`, plus `https://leetcode.com/*` for the problem list, solve status and reusing an open LeetCode tab.
No server and no analytics; data stays in `chrome.storage`. See [PRIVACY.md](PRIVACY.md).

## Development

Load the repo root as an unpacked extension at `chrome://extensions`.
`icons/*.png` are rendered from `icons/icon.svg` at 16, 32, 48 and 128 px.

```sh
npm test       # unit tests
npm run pack   # leetcode-picker.zip for the Chrome Web Store
```
