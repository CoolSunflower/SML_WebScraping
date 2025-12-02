/**
 * Fetcher module for HTTP requests
 * 
 * Provides unified interface for fetching pages via:
 * - Native fetch (for simple GET requests)
 * - Playwright (for JS-heavy sites that need rendering)
 */

let browser = null;

/**
 * Fetches a page and returns its HTML content
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} [options.useHeadless=false] - Use Playwright for JS rendering
 * @param {Object} [options.headers] - Custom headers
 * @param {number} [options.timeout=30000] - Timeout in milliseconds
 * @param {string} [options.waitForSelector] - CSS selector to wait for (headless only)
 * @returns {Promise<string>} - The HTML content
 */
export async function fetchPage(url, options = {}) {
  const {
    useHeadless = false,
    headers = {},
    timeout = 30000,
    waitForSelector = null
  } = options;

  if (useHeadless) {
    return fetchWithPlaywright(url, { timeout, waitForSelector });
  }

  return fetchWithNative(url, { headers, timeout });
}

/**
 * Fetches page using native fetch
 */
async function fetchWithNative(url, { headers, timeout }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...headers
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

/**
 * Fetches page using Playwright (headless browser)
 */
async function fetchWithPlaywright(url, { timeout, waitForSelector }) {
  // Lazy load playwright
  const { chromium } = await import('playwright');

  // Reuse browser instance for efficiency
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { timeout, waitUntil: 'domcontentloaded' });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }

    return await page.content();
  } finally {
    await context.close();
  }
}

/**
 * Closes the browser instance (call on shutdown)
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
