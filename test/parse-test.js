/**
 * Parse Test Script
 * 
 * Loads saved HTML files and tests parsing logic locally.
 * Use this to develop and refine selectors before integrating into scraper.
 * 
 * Usage:
 *   node test/parse-test.js <site-name> [--source get|headless]
 * 
 * Examples:
 *   node test/parse-test.js example-blog
 *   node test/parse-test.js example-blog --source headless
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIGURE YOUR PARSING LOGIC HERE
// ============================================================

// Site-specific parsing configurations: Add your site's config here when developing
const siteConfigs = {
  // Example configuration - replace with actual site config
  'example-blog': {
    // Selectors for extracting blocks from index page
    index: {
      blockSelector: '.article-card, .post-item, article',
      getId: ($el) => $el.attr('data-id') || $el.find('a').attr('href'),
      getUrl: ($el) => $el.find('a').attr('href'),
      getTitle: ($el) => $el.find('h2, h3, .title').first().text().trim(),
      getDate: ($el) => $el.find('.date, time, .published').first().text().trim(),
    },
    // Selectors for extracting content from article page
    article: {
      // Elements to remove before extracting text
      removeSelectors: 'script, style, nav, header, footer, .sidebar, .comments, .related, .advertisement',
      // Main content selector
      // contentSelector: 'article, .article-body, .post-content, .entry-content, main',
      getTitle: ($) => $('h1').first().text().trim(),
      getContent: ($) => {
        // Remove unwanted elements
        $('script, style, nav, header, footer, .sidebar, .comments').remove();
        return $('article, .article-body, .post-content, main').text().trim();
      }
    },
    // Base URL for resolving relative links
    baseUrl: 'https://example.com'
  },

  'patientsknowbest-news': {
    index: {
      blockSelector: '.listing-item',
      getId: ($el) => $el.find('a.image').attr('href') || $el.find('a.title').attr('href'),
      getUrl: ($el) => $el.find('a.image').attr('href') || $el.find('a.title').attr('href'),
      getTitle: ($el) => $el.find('a.title').text().trim(),
      getDate: ($el) => $el.find('.date').text().trim(),
    },
    article: {
      removeSelectors: 'script, style, nav, header, footer, .sidebar, .jp-relatedposts, .x-colophon',
      // contentSelector: '.entry-content',
      getTitle: ($) => $('.entry-content .x-text-content-text-primary').first().text().trim(),
      getContent: ($) => {
        const paragraphs = [];
        $('.entry-content .x-section .x-text.x-content p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            paragraphs.push(text);
          }
        });
        return paragraphs.join('\n\n');
      }
    },
    baseUrl: 'https://patientsknowbest.com'
  },

  'patientsknowbest-blog': {
    index: {
      blockSelector: '.post-column',
      getId: ($el) => $el.find('a').first().attr('href') || $el.find('header a').attr('href'),
      getUrl: ($el) => $el.find('a').first().attr('href') || $el.find('header a').attr('href'),
      getTitle: ($el) => $el.find('header a').text().trim(),
      getDate: ($el) => $el.find('.entry-date').text().trim(),
    },
    article: {
      removeSelectors: 'script, style, nav, footer, .sidebar, .footer-widgets-wrap, .sharedaddy',
      getTitle: ($) => $('article header').first().text().trim(), // just for testing
      getContent: ($) => {
        const paragraphs = [];
        $('article p, article h1').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            paragraphs.push(text);
          }
        });
        return paragraphs.join('\n\n');
      }
    },
    baseUrl: 'https://blog.patientsknowbest.com/'
  },

  'askapatient': {
    index: {
      blockSelector: 'p[style*="border-bottom"][style*="margin-bottom"]',
      getId: ($el) => $el.find('a').first().attr('href'),
      getUrl: ($el) => $el.find('a').first().attr('href'),
      getTitle: ($el) => $el.find('a').first().text().trim(),
      getDate: ($el) => $el.find('span').text().trim(),
    },
    article: {
      removeSelectors: 'script, header, nav',
      getTitle: ($) => $('article.news-article h1').first().text().trim(),
      getContent: ($) => {
        const paragraphs = [];
        $('article.news-article .article-main p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            paragraphs.push(text);
          }
        });
        return paragraphs.join('\n\n');
      }
    },
    baseUrl: 'https://www.askapatient.com/news/pharmnews.asp'
  },

  'emconsulte': {
    index: {
      blockSelector: '.c-listarticles a',
      getId: ($el) => $el.attr('href'),
      getUrl: ($el) => $el.attr('href'),
      getTitle: ($el) => $el.find('.c-listarticles__item__title').text().trim(),
      getDate: ($el) => $el.find('.c-listarticles__item__date').text().trim(),
    },
    article: {
      removeSelectors: 'script, nav',
      getTitle: ($) => {
        const h1 = $('#article_corps h1').first().clone(); // clone so we don't modify DOM
        h1.find('span').remove(); // remove the date span
        return h1.text().trim();
      },
      getContent: ($) => $('#pane_resume').text().trim(),
    },
    baseUrl: 'https://www.em-consulte.com/'
  },

  // Add more site configs as needed:
  // 'another-site': { ... }
};

// ============================================================
// PARSING FUNCTIONS (MIGHT ALSO NEED EDITS FOR TESTING == UPDATED CODE OF SCRAPER)
// ============================================================

// Parse index page and extract blocks
function parseIndex($, config) {
  const blocks = [];
  const { blockSelector, getId, getUrl, getTitle, getDate } = config.index;

  $(blockSelector).each((i, el) => {
    const $el = $(el);
    
    const block = {
      id: getId($el),
      url: getUrl($el),
      title: getTitle($el),
      date: getDate($el)
    };

    // Resolve relative URLs
    if (block.url && block.url.startsWith('/')) {
      block.url = config.baseUrl + block.url;
    }

    // Only add if we have at least an ID or URL
    if (block.id || block.url) {
      blocks.push(block);
    }
  });

  return blocks;
}

// Parse article page and extract content
function parseArticle($, config) {
  const { removeSelectors, getTitle, getContent } = config.article;

  // Remove unwanted elements
  if (removeSelectors) {
    $(removeSelectors).remove();
  }

  return {
    title: getTitle($),
    content: getContent($),
    contentLength: getContent($).length
  };
}

// ============================================================
// MAIN SCRIPT
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node test/parse-test.js <site-name> [--source get|headless]');
    console.log('');
    console.log('Available sites:', Object.keys(siteConfigs).join(', ') || '(none configured)');
    process.exit(1);
  }

  const siteName = args[0];
  const sourceIndex = args.indexOf('--source');
  const source = sourceIndex !== -1 ? args[sourceIndex + 1] : 'get';

  const config = siteConfigs[siteName];
  if (!config) {
    console.error(`No config found for site: ${siteName}`);
    console.log('Available sites:', Object.keys(siteConfigs).join(', ') || '(none configured)');
    console.log('');
    console.log('Add your site config in parse-test.js under siteConfigs');
    process.exit(1);
  }

  const dataDir = join(__dirname, 'data', siteName);
  const indexFile = join(dataDir, `index-${source}.html`);
  const articleFile = join(dataDir, `article-${source}.html`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Parsing: ${siteName} (source: ${source})`);
  console.log(`${'='.repeat(60)}\n`);

  // Parse index page
  if (existsSync(indexFile)) {
    console.log(`[Index] Parsing ${indexFile}`);
    const html = await readFile(indexFile, 'utf-8');
    const $ = cheerio.load(html);

    const blocks = parseIndex($, config);
    
    console.log(`[Index] Found ${blocks.length} blocks:\n`);
    blocks.slice(0, 10).forEach((block, i) => {
      console.log(`  ${i + 1}. ${block.title || '(no title)'}`);
      console.log(`     ID: ${block.id || '(none)'}`);
      console.log(`     URL: ${block.url || '(none)'}`);
      console.log(`     Date: ${block.date || '(none)'}`);
      console.log('');
    });

    if (blocks.length > 10) {
      console.log(`  ... and ${blocks.length - 10} more\n`);
    }
  } else {
    console.log(`[Index] File not found: ${indexFile}`);
    console.log('        Run fetch-test.js first to download the HTML');
  }

  // Parse article page
  if (existsSync(articleFile)) {
    console.log(`\n[Article] Parsing ${articleFile}`);
    const html = await readFile(articleFile, 'utf-8');
    const $ = cheerio.load(html);

    const article = parseArticle($, config);

    console.log(`[Article] Extracted content:\n`);
    console.log(`  Title: ${article.title || '(none)'}`);
    console.log(`  Content length: ${article.contentLength} chars`);
    console.log('');
    console.log('  Content preview (first 500 chars):');
    console.log('  ' + '-'.repeat(50));
    console.log('  ' + article.content.substring(0, 500).replace(/\n/g, '\n  '));
    console.log('  ' + '-'.repeat(50));
  } else {
    console.log(`\n[Article] File not found: ${articleFile}`);
    console.log('          Use --article flag with fetch-test.js to download an article');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Done!');
  console.log('');
  console.log('If parsing looks correct, copy the config to your scraper.');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
