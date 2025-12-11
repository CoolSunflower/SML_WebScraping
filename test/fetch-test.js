/**
 * Fetch Test Script
 * 
 * Fetches website content using both GET request and headless browser,
 * saves to files for local parsing development.
 * 
 * Usage:
 *   node test/fetch-test.js <site-name> <url> [--article <article-url>]
 * 
 * Examples:
 *   node test/fetch-test.js example-blog https://example.com/blog
 *   node test/fetch-test.js example-blog https://example.com/blog --article https://example.com/blog/post-1
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fetch using native GET request
async function fetchWithGet(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetch using Playwright headless browser
async function fetchWithHeadless(url, timeout = 30000) {
  const { chromium } = await import('playwright');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { timeout, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    return await page.content();
  } finally {
    await browser.close();
  }
}

async function fetchWithPuppeteer(url, timeout = 30000) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://example.com');
    
  } finally {
    await browser.close();    
  }
}

// Save content to file
async function saveToFile(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
  console.log(`  Saved to: ${filePath}`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node test/fetch-test.js <site-name> <url> [--article <article-url>]');
    console.log('');
    console.log('Examples:');
    console.log('  node test/fetch-test.js example-blog https://example.com/blog');
    console.log('  node test/fetch-test.js example-blog https://example.com/blog --article https://example.com/blog/post-1');
    process.exit(1);
  }

  const siteName = args[0];
  const indexUrl = args[1];
  const articleIndex = args.indexOf('--article');
  const articleUrl = articleIndex !== -1 ? args[articleIndex + 1] : null;

  const dataDir = join(__dirname, 'data', siteName);

  console.log(`Fetching: ${siteName}`);
  console.log(`Index URL: ${indexUrl}`);
  if (articleUrl) {
    console.log(`Article URL: ${articleUrl}`);
  }

  // Fetch index page with GET
  console.log('[1/4] Fetching index with GET request...');
  try {
    const getContent = await fetchWithGet(indexUrl);
    await saveToFile(join(dataDir, 'index-get.html'), getContent);
  } catch (error) {
    console.log(`   GET failed: ${error.message}`);
  }

  // Fetch index page with headless browser
  console.log('[2/4] Fetching index with headless browser...');
  try {
    const headlessContent = await fetchWithHeadless(indexUrl);
    await saveToFile(join(dataDir, 'index-headless.html'), headlessContent);
  } catch (error) {
    console.log(`   Headless failed: ${error.message}`);
  }

  // Fetch article if provided
  if (articleUrl) {
    console.log('[3/4] Fetching article with GET request...');
    try {
      const getContent = await fetchWithGet(articleUrl);
      await saveToFile(join(dataDir, 'article-get.html'), getContent);
    } catch (error) {
      console.log(`   GET failed: ${error.message}`);
    }

    console.log('[4/4] Fetching article with headless browser...');
    try {
      const headlessContent = await fetchWithHeadless(articleUrl);
      await saveToFile(join(dataDir, 'article-headless.html'), headlessContent);
    } catch (error) {
      console.log(`   Headless failed: ${error.message}`);
    }
  } else {
    console.log('[3/4] Skipping article fetch (no --article provided)');
    console.log('[4/4] Skipping article fetch (no --article provided)');
  }

  console.log('Done! Files saved to:', dataDir);
  console.log('');
  console.log('Next steps:');
  console.log('1. Compare index-get.html vs index-headless.html');
  console.log('2. Identify block selectors in the HTML');
  console.log('3. Run parse-test.js to develop parsing logic');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
