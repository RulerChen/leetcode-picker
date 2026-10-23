# Privacy Policy

Effective October 23, 2026.

LeetCode Picker runs entirely in your browser. It has no server, no analytics and no account.
The developer receives none of your data.

## Data the extension uses

- **LeetCode solve status.** Only when the Status filter is not "Any", the popup requests
  `https://leetcode.com/api/problems/all/` with your existing leetcode.com sign-in.
  It keeps which problems you solved or attempted in `chrome.storage.local` for 5 minutes.
  It never reads or stores your cookies or password.
- **LeetCode Premium status.** When the popup opens, it asks `https://leetcode.com/graphql` with the same sign-in
  whether your account has Premium, so paid-only problems are listed only if you can open them.
  It keeps the yes or no answer in `chrome.storage.local` for 5 minutes.
- **The current tab's address.** When you pick a problem, the popup checks whether the active tab is on leetcode.com
  so it can open the problem there. The address is not stored.
- **Your filter settings**, kept in `chrome.storage.local` so the popup reopens the way you left it.

All of this stays on your device. Removing the extension deletes it.

## Network requests

Besides the solve status and Premium requests above, the extension only downloads public data:
the problem list from leetcode.com (sent without cookies), problem ratings from zerotrac.github.io,
and company lists from api.github.com and raw.githubusercontent.com.
These services see your IP address and which file is requested, under their own privacy policies.
Nothing about you is added to these requests.

## Sharing

The extension does not sell, share or transfer your data to anyone.
The use of information received by LeetCode Picker complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
including the Limited Use requirements: data is used only to filter and open LeetCode problems for you.

## Contact

Questions or concerns: [open an issue](https://github.com/RulerChen/leetcode-picker/issues).
