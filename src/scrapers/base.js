/**
 * Base Scraper class
 * 
 * Provides common patterns for scraping hierarchical websites.
 * Website-specific scrapers should extend this class.
 */

import { fetchPage } from '../utils/fetcher.js';
import { getState, setState } from '../common/state.js';
import { classifyContent } from '../common/parser.js';
import { upsertPost } from '../common/storage.js';
import * as cheerio from 'cheerio';

export class BaseScraper {
  /**
   * @param {Object} config
   * @param {string} config.name - Unique name for this scraper (used for state)
   * @param {string} config.indexUrl - URL of the index/listing page
   * @param {string} config.platform - Platform identifier (e.g., 'blog', 'news')
   * @param {boolean} [config.useHeadless=false] - Whether to use headless browser
   */
  constructor(config) {
    this.name = config.name;
    this.indexUrl = config.indexUrl;
    this.platform = config.platform;
    this.useHeadless = config.useHeadless ?? false;
  }

  /**
   * Main entry point - runs the scraping process
   * @returns {Promise<{processed: number, saved: number}>}
   */
  async run() {
    console.log(`[${this.name}] Starting scrape...`);
    
    const lastState = await getState(this.name);
    console.log(`[${this.name}] Last state:`, lastState);

    // Fetch the index page
    const indexHtml = await fetchPage(this.indexUrl, { 
      useHeadless: this.useHeadless 
    });
    const $ = cheerio.load(indexHtml);

    // Extract blocks from index (website-specific)
    const blocks = await this.extractBlocks($, indexHtml);
    console.log(`[${this.name}] Found ${blocks.length} blocks`);

    if (blocks.length === 0) {
      console.log(`[${this.name}] No blocks found, exiting`);
      return { processed: 0, saved: 0 };
    }

    // Sort blocks newest first (website-specific sorting)
    const sortedBlocks = this.sortBlocks(blocks);

    let processed = 0;
    let saved = 0;
    let newestId = null;

    for (const block of sortedBlocks) {
      // Check if we've reached already-processed content
      if (this.shouldStop(block, lastState)) {
        console.log(`[${this.name}] Reached already-processed content, stopping`);
        break;
      }

      // Track the newest ID for state update
      if (newestId === null) {
        newestId = this.getBlockId(block);
      }

      try {
        // Fetch the article page
        const articleUrl = this.getArticleUrl(block);
        console.log(`[${this.name}] Processing: ${articleUrl}`);
        
        const articleHtml = await fetchPage(articleUrl, { 
          useHeadless: this.useHeadless 
        });
        const article$ = cheerio.load(articleHtml);

        // Extract text content (website-specific)
        const textContent = await this.extractContent(article$, articleHtml, block);
        processed++;

        // Classify the content
        const classification = classifyContent(textContent);
        
        if (classification === null) {
          console.log(`[${this.name}] Content did not match any brand, skipping`);
          continue;
        }

        // Build post data
        const postData = {
          link: articleUrl,
          brand: classification.brand,
          subbrand: classification.subbrand,
          sentiment: classification.sentiment,
          platform: this.platform,
          title: this.getBlockTitle(block),
          content: textContent.substring(0, 500), // Store snippet
          scrapedAt: new Date()
        };

        // Upsert to database
        const result = await upsertPost(postData);
        if (result.success) {
          saved++;
        }

      } catch (error) {
        console.error(`[${this.name}] Error processing block:`, error.message);
        // Continue with next block
      }
    }

    // Update state with newest processed ID
    if (newestId !== null) {
      await setState(this.name, { lastId: newestId, lastRun: new Date().toISOString() });
    }

    console.log(`[${this.name}] Completed: ${processed} processed, ${saved} saved`);
    return { processed, saved };
  }

  // ============ Methods to override in subclasses ============

  /**
   * Extract blocks (article links) from the index page
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} html - Raw HTML
   * @returns {Promise<Array>} - Array of block objects
   */
  async extractBlocks($, html) {
    throw new Error('extractBlocks() must be implemented by subclass');
  }

  /**
   * Sort blocks newest first
   * @param {Array} blocks 
   * @returns {Array}
   */
  sortBlocks(blocks) {
    // Default: assume blocks are already in order
    return blocks;
  }

  /**
   * Get unique identifier for a block (used for state tracking)
   * @param {Object} block 
   * @returns {string}
   */
  getBlockId(block) {
    throw new Error('getBlockId() must be implemented by subclass');
  }

  /**
   * Get the article URL from a block
   * @param {Object} block 
   * @returns {string}
   */
  getArticleUrl(block) {
    throw new Error('getArticleUrl() must be implemented by subclass');
  }

  /**
   * Get the title from a block (optional)
   * @param {Object} block 
   * @returns {string|null}
   */
  getBlockTitle(block) {
    return block.title ?? null;
  }

  /**
   * Check if we should stop processing (reached old content)
   * @param {Object} block 
   * @param {Object|null} lastState 
   * @returns {boolean}
   */
  shouldStop(block, lastState) {
    if (!lastState || !lastState.lastId) {
      return false;
    }
    return this.getBlockId(block) === lastState.lastId;
  }

  /**
   * Extract text content from article page
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} html - Raw HTML
   * @param {Object} block - Original block data
   * @returns {Promise<string>}
   */
  async extractContent($, html, block) {
    throw new Error('extractContent() must be implemented by subclass');
  }
}
