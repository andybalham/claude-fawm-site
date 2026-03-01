import fs from "fs/promises";
import path from "path";

/**
 * Recursively scans a directory for MP3 files.
 * Skips hidden files/folders (names starting with '.').
 * @param {string} rootPath - Absolute path to scan
 * @returns {Promise<string[]>} Array of absolute paths to MP3 files
 */
export async function scanDirectory(rootPath) {
  const results = [];
  await walkDirectory(rootPath, results);
  return results;
}

async function walkDirectory(dirPath, results) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden files and folders
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) {
      results.push(fullPath);
    }
  }
}
