# WebScraping

Minimal Node.js scraper framework used for local development and cron-driven runs.

**Purpose:** fetch site index pages, extract article blocks, fetch article pages, classify by keywords, and upsert matches to storage.

**Prerequisites:**
- Node.js (v16+ recommended)
- npm (comes with Node)

**Install dependencies:**
```
npm install
npx playwright install
```

**Quick commands:**
- Fetch an index (saves HTML to `test/data/<site>`):
```powershell
node test/fetch-test.js <siteKey> <indexUrl>
```
- Run local parse against saved files:
```powershell
node test/parse-test.js <siteKey>
```
- Run the end-to-end test scraper (live run):
```powershell
node test/test-scraper.js
```

**Add a new site scraper (summary):**
1. Create a new file under `src/scrapers/sites/` copying the site template.
2. Extend the `BaseScraper` and implement required methods:
	- `extractBlocks($, html)`
	- `getBlockId(block)`
	- `getArticleUrl(block)`
	- `extractContent($, html, block)`
3. Use `test/fetch-test.js` to save index HTML, tune selectors with `test/parse-test.js`, then run `test/test-scraper.js`.

**Data & state:**
- Saved HTML for tests: `test/data/<site>/`
- Scraper state (last processed id): `data/state.json`
