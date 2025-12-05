// Name of website: https://www.em-consulte.com/

import { BaseScraper } from '../base.js';

export class EmConsulteScraper extends BaseScraper {
  constructor() {
    super({
      name: 'emconsulte',
      indexUrl: 'https://www.em-consulte.com/',
      platform: 'EmConsulte',
      useHeadless: false, // works with GET request directly
    });
  }

  // Extract article blocks from the index page HTML
  extractBlocks($, html) {
    const blocks = [];

    $('.c-listarticles a').each((i, el) => {
      const $block = $(el);
      
      // Get URL
      const url = $block.attr('href');
      
      // Get title text
      const title = $block.find('.c-listarticles__item__title').text().trim();
      
      // Get date
      const date = $block.find('.c-listarticles__item__date').text().trim();

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
    // block url looks like //www.em-consulte.com/article/1780284...
    // so need to add https: prefix
    const prefix = block.url.startsWith('//') ? 'https:' : '';
    return prefix + block.url;
  }

  // Extract article content from an article page
  extractContent($, html, block) {
    // Remove unwanted elements
    $('script, nav').remove();

    // Extract all paragraph content from the article body
    return $('#pane_resume').text().trim();
  }
}

// Export a configured instance
export default new EmConsulteScraper();