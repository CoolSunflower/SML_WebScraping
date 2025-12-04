// Name of website: https://blog.patientsknowbest.com/

import { BaseScraper } from '../base.js';

export class PatientsKnowBestBlogScraper extends BaseScraper {
  constructor() {
    super({
      name: 'patientsknowbest-blog',
      indexUrl: 'https://blog.patientsknowbest.com/',
      platform: 'PatientsKnowBest-Blog',
      useHeadless: false, // works with GET request directly
    });
  }

  // Extract article blocks from the index page HTML
  extractBlocks($, html) {
    const blocks = [];

    $('.post-column').each((i, el) => {
      const $block = $(el);
      
      // Get URL
      const url = $block.find('a').first().attr('href') || 
                  $block.find('header a').attr('href');
      
      // Get title text
      const title = $block.find('header a').text().trim();
      
      // Get date
      const date = $block.find('.entry-date').text().trim();

      if (url && title) {
        blocks.push({
          url,
          title,
          date
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

  // Extract article content from an article page
  extractContent($, html, block) {
    // Remove unwanted elements
    $('script, style, nav, footer, .sidebar, .footer-widgets-wrap, .sharedaddy').remove();

    // Extract all paragraph content from the article body
    const paragraphs = [];
    $('article p, article h1').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) { // Filter out empty/short paragraphs
        paragraphs.push(text);
      }
    });
    
    return paragraphs.join('\n\n');
  }
}

// Export a configured instance
export default new PatientsKnowBestBlogScraper();