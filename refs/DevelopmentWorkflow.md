# Adding a New Website Scraper

Quick guide to add a new website to the scraping system.

## Workflow Overview

```
1. Fetch HTML  →  2. Find Selectors  →  3. Create Scraper  →  4. Test & Run
```

---

## Step 1: Fetch the Website HTML

```bash
node test/fetch-test.js <site-name> "<index-url>"
```

**Example:**
```bash
node test/fetch-test.js myblog "https://myblog.com/news/"

OR

node test/fetch-test.js example-blog https://example.com/blog --article https://example.com/blog/post-1
```

This saves HTML files to `test/data/<site-name>/`:
- `index-get.html` - Fetched via simple GET request
- `index-headless.html` - Fetched via headless browser

**Tip:** Compare both files. If `index-get.html` has the full content, use GET (faster). If content only appears in headless version, the site uses JavaScript rendering.

---

## Step 2: Find the CSS Selectors

Open the saved HTML in a browser or text editor. Find:

| What to find | Example selector |
|-------------|------------------|
| Article container | `.article-card`, `.post-item`, `.listing-item` |
| Article URL | `a.title[href]`, `a.read-more[href]` |
| Title | `.title`, `h2`, `.headline` |
| Date | `.date`, `time`, `.published` |
| Content (on article page) | `.entry-content p`, `.article-body` |

To verify this works add a new entry in parse-test in variable `siteConfigs` with appropriate tags extracted from Inspect Element and verify by running using: `node test/parse-test.js <siteKey>` to ensure output matches what you expect from values on the website.

---

## Step 3: Create the Scraper

Create `src/scrapers/sites/<number>.js`:

```javascript
// Name of website: https://myblog.com/news/

import { BaseScraper } from '../base.js';

export class MyBlogScraper extends BaseScraper {
  constructor() {
    super({
      name: 'myblog',                          // Unique identifier
      indexUrl: 'https://myblog.com/news/',    // Index/listing page URL
      platform: 'MyBlog',                      // Platform name for storage
      useHeadless: false,                      // true if site needs JS
    });
  }

  // REQUIRED: Extract article blocks from index page
  extractBlocks($, html) {
    const blocks = [];
    
    $('.article-card').each((i, el) => {
      const $block = $(el);
      blocks.push({
        url: $block.find('a').attr('href'),
        title: $block.find('.title').text().trim(),
        date: $block.find('.date').text().trim(),
      });
    });
    
    return blocks;
  }

  // REQUIRED: Unique ID for tracking (usually URL)
  getBlockId(block) {
    return block.url;
  }

  // REQUIRED: Get full article URL
  getArticleUrl(block) {
    // If URLs are relative, prepend base URL
    if (block.url.startsWith('/')) {
      return 'https://myblog.com' + block.url;
    }
    return block.url;
  }

  // REQUIRED: Extract article text content
  extractContent($, html, block) {
    // Remove unwanted elements
    $('script, style, nav, .sidebar, .comments').remove();
    
    // Extract text from content area
    return $('.article-body').text().trim();
  }

  // NOTE: After running the parse-test function, if you notice that the newest content does not appear on top then you would need to override the sortBlocks function to ensure that newest content is always first
}

export default new MyBlogScraper();
```

---

## Step 4: Test the Scraper

### Quick test with saved HTML:
```bash
node test/test-scraper.js
// CHANGE IMPORT AT TOP OF THIS FILE TO THE NEWLY CREATED SCRAPER
```

### Live test (fetches from actual website):
```bash
node -e "
  import s from './src/scrapers/sites/1.js'; // UPDATE THIS LINE
  import {fetchPage} from './src/utils/fetcher.js';
  import * as cheerio from 'cheerio';
  
  const html = await fetchPage(s.indexUrl);
  const $ = cheerio.load(html);
  const blocks = s.extractBlocks($, html);
  
  console.log('Found', blocks.length, 'blocks');
  blocks.slice(0,3).forEach(b => console.log('-', b.title));
"
```

### Full scraper run:
```bash
node src/index.js --run
```

---

## Required Methods Summary

| Method | Purpose | Returns |
|--------|---------|---------|
| `extractBlocks($, html)` | Parse index page, find all article blocks | `Array` of block objects |
| `getBlockId(block)` | Unique identifier for state tracking | `string` (usually URL) |
| `getArticleUrl(block)` | Full URL to fetch article | `string` |
| `extractContent($, html, block)` | Extract text from article page | `string` |

---

## Common Patterns

### Relative URLs
```javascript
getArticleUrl(block) {
  if (block.url.startsWith('/')) {
    return 'https://example.com' + block.url;
  }
  return block.url;
}
```

### Multiple content selectors
```javascript
extractContent($, html, block) {
  const paragraphs = [];
  $('.content p, .content li').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 10) {
      paragraphs.push(text);
    }
  });
  return paragraphs.join('\n\n');
}
```

### Sites needing JavaScript
```javascript
super({
  // ...
  useHeadless: true,  // Uses Playwright headless browser
});
```

---

## File Structure

```
src/scrapers/
  base.js              # Base class (don't modify)
  sites/
    1.js               # First website scraper
    2.js               # Second website scraper
    ...

test/
  data/
    <site-name>/       # Saved HTML for each site
      index-get.html
      index-headless.html
  fetch-test.js        # Download HTML for testing
  test-scraper.js      # Test scraper against saved HTML
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No blocks found | Check selector in browser DevTools |
| Empty content | Try `useHeadless: true` |
| Wrong URLs | Check if URLs are relative, add base URL |
| Duplicate blocks | Make selector more specific |
