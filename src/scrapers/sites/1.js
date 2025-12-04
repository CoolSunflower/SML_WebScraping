// Name of website: https://patientsknowbest.com/news/

import { BaseScraper } from '../base.js';

export class PatientsKnowBestNewsScraper extends BaseScraper {
  constructor() {
    super({
      name: 'patientsknowbest-news',
      indexUrl: 'https://patientsknowbest.com/news/',
      platform: 'PatientsKnowBest-News',
      useHeadless: false, // works with GET request directly
    });
  }

  /**
   * Extract article blocks from the index page HTML
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} html - Raw HTML of the index page
   * @returns {Array} Array of block objects with url, title, date
   */
  extractBlocks($, html) {
    const blocks = [];

    $('.listing-item').each((i, el) => {
      const $block = $(el);
      
      // Get URL from image link or title link
      const url = $block.find('a.image').attr('href') || 
                  $block.find('a.title').attr('href');
      
      // Get title text
      const title = $block.find('a.title').text().trim();
      
      // Get date
      const date = $block.find('.date').text().trim();
      
      if (url && title) {
        blocks.push({
          url,
          title,
          date,
        });
      }
    });

    return blocks;
  }

  // Get unique identifier for a block (used for state tracking)
  getBlockId(block) {
    return block.url;
  }

  // Get the article URL from a block
  getArticleUrl(block) {
    return block.url;
  }

  /**
   * Extract article content from an article page
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} html - Raw HTML of the article page
   * @param {Object} block - Block object for context
   * @returns {string} Extracted text content
   */
  extractContent($, html, block) {
    // Get the main content area
    const $content = $('.entry-content');
    
    // Extract all paragraph content from the article body
    // The main content is in .x-text.x-content p elements within .x-section
    const paragraphs = [];
    $content.find('.x-section .x-text.x-content p').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) { // Filter out empty/short paragraphs
        paragraphs.push(text);
      }
    });
    
    return paragraphs.join('\n\n');
  }
}

// Export a configured instance
export default new PatientsKnowBestNewsScraper();
