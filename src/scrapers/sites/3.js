// Name of website: https://www.askapatient.com/news/pharmnews.asp

import { BaseScraper } from '../base.js';

export class AskAPatientScraper extends BaseScraper {
  constructor() {
    super({
      name: 'askapatient',
      indexUrl: 'https://www.askapatient.com/news/pharmnews.asp',
      platform: 'AskAPatient',
      useHeadless: true, // does not work with GET request directly
    });
  }

  // Extract article blocks from the index page HTML
  extractBlocks($, html) {
    const blocks = [];

    $('p[style*="border-bottom"][style*="margin-bottom"]').each((i, el) => {
      const $block = $(el);
      
      // Get URL
      const url = $block.find('a').first().attr('href');
      
      // Get title text
      const title = $block.find('a').first().text().trim();
      
      // Get date
      const date = $block.find('span').text().trim();

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
    $('script, header, nav').remove();

    // Extract all paragraph content from the article body
    const paragraphs = [];
    $('article.news-article .article-main p').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) { // Filter out empty/short paragraphs
        paragraphs.push(text);
      }
    });
    
    return paragraphs.join('\n\n');
  }
}

// Export a configured instance
export default new AskAPatientScraper();