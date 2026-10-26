# LeetCode Picker

Chrome extension that picks a random LeetCode problem.

<div align="center">
 <img src="store/screenshot-1-rating.png" width="75%" alt="Pick by contest rating">
</div>
<div align="center">
  <img src="store/screenshot-2-company.png" width="75%" alt="Pick by difficulty and company">
</div>

## Install

You can install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/leetcode-picker/jgineokpngglkppkedpbmglfhblhehgf) or load it as an unpacked extension:

1. Clone this repo, or download it as a ZIP and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repo folder.
4. Pin LeetCode Picker from the toolbar's extensions menu. Sign in to leetcode.com to use the Status filter.

## Features

- Pick by contest rating range or by difficulty.
- Filter by topic, company, solve status and minimum likes.

## Release

Bump `version` in `manifest.json`, commit, then push a matching tag such as `v0.1.1`. The [Release workflow](.github/workflows/release.yml) runs the tests, attaches the zip to a GitHub release and publishes it to the Chrome Web Store. It needs the repo variables `CWS_PUBLISHER_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT`.

## Data

Ratings from [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating)  
Companies from [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)
