# LeetCode Picker

A Chrome extension (Manifest V3) that picks a random LeetCode problem from the toolbar popup.
Unofficial; not affiliated with LeetCode.

## Filters

| Filter | Meaning |
|---|---|
| Difficulty | Easy / Medium / Hard. |
| Rating | Contest rating range from zerotrac. Only contest problems (about 2600) have a rating. With a range set, unrated problems are excluded unless "unrated" is checked. |
| Topics | Matches problems that have **any** of the selected topics. |
| Company | One company plus a time window (30 days, 3 months, 6 months, older, all time). |
| Status | Your solve status on leetcode.com: not attempted, attempted but not solved, not solved, solved. Requires being signed in to leetcode.com in the same Chrome profile. |
| Premium | Include paid-only problems. Off by default. |

**Pick** opens a random matching problem, never the one you are on. **◀ / ▶** move through the problems picked
this browser session. If the active tab is on leetcode.com the problem opens there, otherwise in a new tab.

## Data sources

| Data | Source | Cached |
|---|---|---|
| Problem list and topics | `https://leetcode.com/graphql` (anonymous, 100 problems per page) | 24 h |
| Solve status | `https://leetcode.com/api/problems/all/` with your session cookie | 5 min |
| Contest rating | [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating) `data.json` | 24 h |
| Company problems | [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems), fetched per company on demand | 24 h |

If a refresh fails, the last cached copy is used. The company repository has no license; nothing from it is
bundled in the extension.

Chrome sends the leetcode.com session cookie with the extension's request because the extension has host
permission for leetcode.com. This does not work if third-party cookies are blocked; the popup then asks you to
sign in.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Remember filters, cache problem data, keep the session's pick history. |
| `https://leetcode.com/*` | Read the problem list and your solve status, and see whether the active tab is on leetcode.com. |

The GitHub and zerotrac sources allow cross-origin requests, so they need no host permission.

## Privacy

The extension has no server and no analytics. Your solve status is read from leetcode.com and stored only in
`chrome.storage.local` on your machine. The only network requests go to leetcode.com, api.github.com,
raw.githubusercontent.com and zerotrac.github.io as listed above.

## Development

Load the repository root as an unpacked extension at `chrome://extensions` (Developer mode on).

```sh
npm test       # unit tests for the filtering and CSV logic, no dependencies
npm run pack   # leetcode-picker.zip for the Chrome Web Store
```
