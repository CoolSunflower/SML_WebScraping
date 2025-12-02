/**
 * Example scraper implementation
 * 
 * This is a template showing how to implement a website-specific scraper.
 * Copy this file and modify for each new website.
 */

import { BaseScraper } from '../base.js';

export class ExampleScraper extends BaseScraper {
  constructor() {
    super({
      name: 'example-blog',           // Unique identifier
      indexUrl: 'https://example.com/blog',  // Index/listing page
      platform: 'blog',               // Platform type
      useHeadless: false              // Set true if JS rendering needed
    });
  }

  /**
   * Extract article blocks from the index page
   */
  async extractBlocks($, html) {
    const blocks = [];

    // Example: Find all article cards on the page
    // Modify selectors based on actual website structure
    $('.article-card').each((i, el) => {
      const $el = $(el);
      blocks.push({
        id: $el.attr('data-id') || $el.find('a').attr('href'),
        url: $el.find('a').attr('href'),
        title: $el.find('.title').text().trim(),
        date: $el.find('.date').text().trim()
      });
    });

    return blocks;
  }

  /**
   * Sort blocks newest first
   */
  sortBlocks(blocks) {
    // Example: Sort by date descending
    // Modify based on how dates are formatted
    return blocks.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  }

  /**
   * Get unique ID for a block
   */
  getBlockId(block) {
    return block.id;
  }

  /**
   * Get article URL from block
   */
  getArticleUrl(block) {
    // Handle relative URLs
    if (block.url.startsWith('/')) {
      return `https://example.com${block.url}`;
    }
    return block.url;
  }

  /**
   * Extract main content from article page
   */
  async extractContent($, html, block) {
    // Example: Extract article body text
    // Modify selectors based on actual website structure
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .sidebar, .comments').remove();
    
    // Get main article content
    const content = $('.article-body').text().trim();
    
    return content;
  }
}

// Export a factory function for easy instantiation
export function createScraper() {
  return new ExampleScraper();
}
