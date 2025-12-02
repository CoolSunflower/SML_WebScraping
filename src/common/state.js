/**
 * State management module for tracking scraping progress
 * 
 * Currently uses file-based storage. Can be swapped for database storage later.
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '../../data/state.json');

/**
 * Reads the entire state file
 * @returns {Promise<Object>}
 */
async function readStateFile() {
  try {
    if (!existsSync(STATE_FILE)) {
      return {};
    }
    const data = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[State] Error reading state file:', error.message);
    return {};
  }
}

/**
 * Writes the entire state file
 * @param {Object} state 
 */
async function writeStateFile(state) {
  try {
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[State] Error writing state file:', error.message);
    throw error;
  }
}

/**
 * Gets the last saved state for a website
 * @param {string} websiteName - Unique identifier for the website
 * @returns {Promise<any>} - The last saved state, or null if none exists
 */
export async function getState(websiteName) {
  const allState = await readStateFile();
  return allState[websiteName] ?? null;
}

/**
 * Sets the state for a website
 * @param {string} websiteName - Unique identifier for the website
 * @param {any} state - The state to save (can be any JSON-serializable value)
 * @returns {Promise<void>}
 */
export async function setState(websiteName, state) {
  const allState = await readStateFile();
  allState[websiteName] = state;
  await writeStateFile(allState);
  console.log(`[State] Updated state for ${websiteName}`);
}

/**
 * Clears the state for a website
 * @param {string} websiteName - Unique identifier for the website
 * @returns {Promise<void>}
 */
export async function clearState(websiteName) {
  const allState = await readStateFile();
  delete allState[websiteName];
  await writeStateFile(allState);
  console.log(`[State] Cleared state for ${websiteName}`);
}
