/**
 * Main entry point for the web scraping system
 * 
 * Handles:
 * - Loading all scrapers
 * - Scheduling via cron (optional)
 * - Manual execution
 */

import cron from 'node-cron';
import { closeBrowser } from './utils/fetcher.js';

// Import all scrapers here
// import { createScraper as createExampleScraper } from './scrapers/sites/example.js';

/**
 * Registry of all scrapers with their cron schedules
 * Add new scrapers here as they are implemented
 */
const scraperRegistry = [
  // {
  //   factory: createExampleScraper,
  //   schedule: '0 */6 * * *',  // Every 6 hours
  //   enabled: true
  // }
];

/**
 * Runs a single scraper
 */
async function runScraper(scraperFactory) {
  const scraper = scraperFactory();
  try {
    const result = await scraper.run();
    return result;
  } catch (error) {
    console.error(`[${scraper.name}] Fatal error:`, error);
    return { processed: 0, saved: 0, error: error.message };
  }
}

/**
 * Runs all enabled scrapers sequentially
 */
async function runAllScrapers() {
  console.log('='.repeat(50));
  console.log(`Starting scrape run at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  const results = [];

  for (const { factory, enabled } of scraperRegistry) {
    if (!enabled) continue;
    
    const result = await runScraper(factory);
    results.push(result);
  }

  console.log('='.repeat(50));
  console.log('Scrape run completed');
  console.log('='.repeat(50));

  return results;
}

/**
 * Sets up cron schedules for all scrapers
 */
function setupCronJobs() {
  console.log('Setting up cron jobs...');

  for (const { factory, schedule, enabled } of scraperRegistry) {
    if (!enabled) continue;

    const scraper = factory();
    
    cron.schedule(schedule, async () => {
      console.log(`[Cron] Triggering ${scraper.name}`);
      await runScraper(factory);
    });

    console.log(`[Cron] Scheduled ${scraper.name}: ${schedule}`);
  }

  console.log('Cron jobs ready. Waiting for triggers...');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--run')) {
    // Run all scrapers once and exit
    await runAllScrapers();
    await closeBrowser();
    process.exit(0);
  } else if (args.includes('--cron')) {
    // Set up cron jobs and keep running
    setupCronJobs();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await closeBrowser();
      process.exit(0);
    });
  } else {
    console.log('Usage:');
    console.log('  node src/index.js --run   Run all scrapers once');
    console.log('  node src/index.js --cron  Start cron scheduler');
  }
}

// Run main
main().catch(console.error);
