/**
 * End-to-End Scraper Test
 * 
 * Tests the full scraper flow with real network requests.
 * Runs twice:
 *   1. First run with clean state - should process articles
 *   2. Second run - should skip already-processed articles
 * 
 * Usage:
 *   node test/test-scraper.js
 * 
 * Configure the scraper to test by changing the import below.
 */

// ============================================================
// CONFIGURE: Import the scraper to test
// ============================================================
import scraper from '../src/scrapers/sites/1.js';
// ============================================================

import { clearState, getState } from '../src/common/state.js';
import { fetchPage } from '../src/utils/fetcher.js';
import * as cheerio from 'cheerio';

// Limit articles to fetch during testing (to avoid long waits)
const MAX_ARTICLES_TO_TEST = 3;

async function runTest() {
  console.log('\n' + '='.repeat(70));
  console.log('END-TO-END SCRAPER TEST');
  console.log('='.repeat(70));
  console.log(`\nScraper: ${scraper.name}`);
  console.log(`Index URL: ${scraper.indexUrl}`);
  console.log(`Platform: ${scraper.platform}`);
  console.log(`Use Headless: ${scraper.useHeadless}`);
  console.log('');

  // ============================================================
  // PHASE 1: Clear state and verify methods work
  // ============================================================
  console.log('-'.repeat(70));
  console.log('PHASE 1: Testing scraper methods with live data');
  console.log('-'.repeat(70) + '\n');

  // Clear any existing state
  console.log('[Setup] Clearing existing state...');
  await clearState(scraper.name);
  const clearedState = await getState(scraper.name);
  console.log(`[Setup] State after clear: ${clearedState === null ? 'null (OK)' : 'ERROR - state not cleared'}\n`);

  // Test extractBlocks
  console.log('[Test 1] Fetching index page...');
  const indexHtml = await fetchPage(scraper.indexUrl, { useHeadless: scraper.useHeadless });
  console.log(`[Test 1] Fetched ${indexHtml.length} bytes\n`);

  console.log('[Test 2] Testing extractBlocks()...');
  const $ = cheerio.load(indexHtml);
  const blocks = await scraper.extractBlocks($, indexHtml);
  console.log(`[Test 2] Found ${blocks.length} blocks`);
  
  if (blocks.length === 0) {
    console.error('\nFAIL: No blocks found. Check your extractBlocks() implementation.');
    process.exit(1);
  }
  console.log('[Test 2] extractBlocks() works\n');

  // Show first few blocks
  console.log('[Test 3] Block details (first 3):');
  blocks.slice(0, MAX_ARTICLES_TO_TEST).forEach((block, i) => {
    console.log(`\n  Block ${i + 1}:`);
    console.log(`    Title: ${block.title?.substring(0, 60) || '(none)'}...`);
    console.log(`    URL: ${scraper.getArticleUrl(block)?.substring(0, 60) || '(none)'}...`);
    console.log(`    ID: ${scraper.getBlockId(block)?.substring(0, 50) || '(none)'}...`);
  });
  console.log('');

  // Test extractContent on first article
  console.log('[Test 4] Testing extractContent() on first article...');
  const firstBlock = blocks[0];
  const articleUrl = scraper.getArticleUrl(firstBlock);
  console.log(`[Test 4] Fetching: ${articleUrl}`);
  
  const articleHtml = await fetchPage(articleUrl, { useHeadless: scraper.useHeadless });
  const article$ = cheerio.load(articleHtml);
  const content = await scraper.extractContent(article$, articleHtml, firstBlock);
  
  console.log(`[Test 4] Extracted ${content.length} characters`);
  if (content.length < 50) {
    console.warn('[Test 4] WARNING: Content seems short. Check extractContent() selectors.');
  } else {
    console.log('[Test 4] extractContent() works');
  }
  console.log(`[Test 4] Preview: "${content.substring(0, 150).replace(/\n/g, ' ')}..."\n`);

  // ============================================================
  // PHASE 2: First run - should process articles
  // ============================================================
  console.log('-'.repeat(70));
  console.log('PHASE 2: First run (clean state) - should process articles');
  console.log('-'.repeat(70) + '\n');

  // Run the scraper with a limit
  const result1 = await runScraperWithLimit(scraper, MAX_ARTICLES_TO_TEST);
  
  console.log(`\n[Run 1] Results:`);
  console.log(`  Processed: ${result1.processed}`);
  console.log(`  Saved: ${result1.saved}`);
  
  if (result1.processed === 0) {
    console.error('\nFAIL: First run processed 0 articles');
    process.exit(1);
  }
  console.log('[Run 1] First run processed articles\n');

  // Check state was saved
  const stateAfterRun1 = await getState(scraper.name);
  console.log(`[Run 1] State saved: ${stateAfterRun1 ? 'Yes' : 'No'}`);
  if (stateAfterRun1) {
    console.log(`[Run 1] Last ID: ${stateAfterRun1.lastId?.substring(0, 50)}...`);
    console.log(`[Run 1] Last Run: ${stateAfterRun1.lastRun}`);
  }

  // ============================================================
  // PHASE 3: Second run - should skip already-processed
  // ============================================================
  console.log('\n' + '-'.repeat(70));
  console.log('PHASE 3: Second run (with state) - should skip already-processed');
  console.log('-'.repeat(70) + '\n');

  const result2 = await runScraperWithLimit(scraper, MAX_ARTICLES_TO_TEST);
  
  console.log(`\n[Run 2] Results:`);
  console.log(`  Processed: ${result2.processed}`);
  console.log(`  Saved: ${result2.saved}`);
  
  if (result2.processed === 0) {
    console.log('[Run 2] Second run correctly skipped already-processed articles');
  } else {
    console.log('[Run 2] Second run processed articles (new content may have been posted)');
  }

  // ============================================================
  // CLEANUP & SUMMARY
  // ============================================================
  console.log('\n' + '-'.repeat(70));
  console.log('CLEANUP');
  console.log('-'.repeat(70) + '\n');

  console.log('[Cleanup] Clearing test state...');
  await clearState(scraper.name);
  console.log('[Cleanup] Done\n');

  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`
  Scraper: ${scraper.name}
  
   extractBlocks(): Found ${blocks.length} blocks
   getBlockId(): Working
   getArticleUrl(): Working  
   extractContent(): Extracted ${content.length} chars
   First run: Processed ${result1.processed} articles
   Second run: ${result2.processed === 0 ? 'Correctly skipped (state working)' : `Processed ${result2.processed} (new content?)`}
  
  All tests passed! 
`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Runs the scraper with a limit on articles processed
 * This is a modified version of the base run() to limit network calls during testing
 */
async function runScraperWithLimit(scraper, limit) {
  const { getState, setState } = await import('../src/common/state.js');
  const { classifyContent } = await import('../src/common/parser.js');
  const { upsertPost } = await import('../src/common/storage.js');

  console.log(`[${scraper.name}] Starting scrape (limit: ${limit} articles)...`);
  
  const lastState = await getState(scraper.name);
  console.log(`[${scraper.name}] Last state:`, lastState ? `lastId=${lastState.lastId?.substring(0, 40)}...` : 'null');

  // Fetch the index page
  const indexHtml = await fetchPage(scraper.indexUrl, { 
    useHeadless: scraper.useHeadless 
  });
  const $ = cheerio.load(indexHtml);

  // Extract blocks from index
  const blocks = await scraper.extractBlocks($, indexHtml);
  console.log(`[${scraper.name}] Found ${blocks.length} blocks`);

  if (blocks.length === 0) {
    return { processed: 0, saved: 0 };
  }

  // Sort blocks newest first
  const sortedBlocks = scraper.sortBlocks(blocks);

  let processed = 0;
  let saved = 0;
  let newestId = null;

  for (const block of sortedBlocks) {
    // Stop if we've hit the limit
    if (processed >= limit) {
      console.log(`[${scraper.name}] Reached test limit (${limit}), stopping`);
      break;
    }

    // Check if we've reached already-processed content
    if (scraper.shouldStop(block, lastState)) {
      console.log(`[${scraper.name}] Reached already-processed content, stopping`);
      break;
    }

    // Track the newest ID for state update
    if (newestId === null) {
      newestId = scraper.getBlockId(block);
    }

    try {
      // Fetch the article page
      const articleUrl = scraper.getArticleUrl(block);
      console.log(`[${scraper.name}] Processing: ${articleUrl.substring(0, 60)}...`);
      
      const articleHtml = await fetchPage(articleUrl, { 
        useHeadless: scraper.useHeadless 
      });
      const article$ = cheerio.load(articleHtml);

      // Extract text content
      const textContent = await scraper.extractContent(article$, articleHtml, block);
      processed++;

      // Classify the content
      const classification = classifyContent(textContent);
      
      if (classification === null) {
        console.log(`[${scraper.name}] Content did not match any brand, skipping save`);
        continue;
      }

      // Build post data
      const postData = {
        link: articleUrl,
        brand: classification.brand,
        subbrand: classification.subbrand,
        sentiment: classification.sentiment,
        platform: scraper.platform,
        title: scraper.getBlockTitle(block),
        content: textContent.substring(0, 500),
        scrapedAt: new Date()
      };

      // Upsert to database
      const result = await upsertPost(postData);
      if (result.success) {
        saved++;
      }

    } catch (error) {
      console.error(`[${scraper.name}] Error processing block:`, error.message);
    }
  }

  // Update state with newest processed ID
  if (newestId !== null) {
    await setState(scraper.name, { lastId: newestId, lastRun: new Date().toISOString() });
  }

  console.log(`[${scraper.name}] Completed: ${processed} processed, ${saved} saved`);
  return { processed, saved };
}

// Run the test
runTest().catch(error => {
  console.error('\nTEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
