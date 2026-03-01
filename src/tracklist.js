import fs from "fs/promises";
import path from "path";

/**
 * Recursively find all folders containing at least one .mp3 file.
 */
async function findMusicFolders(rootPath) {
  const folders = new Set();
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  let hasMp3 = false;
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      const subFolders = await findMusicFolders(fullPath);
      for (const f of subFolders) folders.add(f);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) {
      hasMp3 = true;
    }
  }
  if (hasMp3) folders.add(rootPath);
  return folders;
}

/**
 * Get sorted list of .mp3 filenames in a folder.
 */
async function getMp3Files(folderPath) {
  const entries = await fs.readdir(folderPath);
  return entries
    .filter((name) => name.toLowerCase().endsWith(".mp3"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Write a new tracklist.txt with header comments and filenames.
 */
export async function writeTracklist(folderPath, filenames) {
  const folderName = path.basename(folderPath);
  const lines = [
    `# Tracklist for ${folderName}`,
    `# Edit the order of filenames below to control track ordering.`,
    `# Lines starting with # are comments and are ignored.`,
    ``,
    ...filenames,
    ``,
  ];
  const content = lines.join("\n");
  await fs.writeFile(path.join(folderPath, "tracklist.txt"), content, "utf-8");
}

/**
 * Append new filenames to an existing tracklist.txt.
 */
export async function appendToTracklist(filePath, newFilenames) {
  const existing = await fs.readFile(filePath, "utf-8");
  const lines = [
    ``,
    `# New tracks added`,
    ...newFilenames,
    ``,
  ];
  const append = lines.join("\n");
  await fs.writeFile(filePath, existing.trimEnd() + "\n" + append, "utf-8");
}

/**
 * Parse a tracklist.txt, returning ordered filenames that exist on disk.
 */
export async function parseTracklist(filePath) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return [];
  }

  const folderPath = path.dirname(filePath);
  let diskFiles;
  try {
    diskFiles = await getMp3Files(folderPath);
  } catch {
    return [];
  }

  // Build case-insensitive lookup: lowercase name -> actual name on disk
  const diskMap = new Map();
  for (const f of diskFiles) {
    diskMap.set(f.toLowerCase(), f);
  }

  const ordered = [];
  const seen = new Set();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const key = line.toLowerCase();
    if (diskMap.has(key) && !seen.has(key)) {
      ordered.push(diskMap.get(key));
      seen.add(key);
    }
  }

  return ordered;
}

/**
 * Sync tracklists for all music folders under rootPath.
 * Creates new tracklist.txt where missing, appends new tracks where needed.
 * Returns { created, updated, unchanged } counts.
 */
export async function syncAllTracklists(rootPath) {
  const folders = await findMusicFolders(rootPath);
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const folder of folders) {
    const tracklistPath = path.join(folder, "tracklist.txt");
    const mp3Files = await getMp3Files(folder);

    let exists = false;
    try {
      await fs.access(tracklistPath);
      exists = true;
    } catch {
      // does not exist
    }

    if (!exists) {
      await writeTracklist(folder, mp3Files);
      console.log(`Created tracklist.txt in ${path.relative(rootPath, folder)}`);
      created++;
    } else {
      // Parse existing and find new files
      const listed = await parseTracklist(tracklistPath);
      const listedSet = new Set(listed.map((f) => f.toLowerCase()));
      const newFiles = mp3Files.filter((f) => !listedSet.has(f.toLowerCase()));

      if (newFiles.length > 0) {
        await appendToTracklist(tracklistPath, newFiles);
        console.log(
          `Updated tracklist.txt in ${path.relative(rootPath, folder)} (+${newFiles.length} tracks)`
        );
        updated++;
      } else {
        unchanged++;
      }
    }
  }

  return { created, updated, unchanged };
}
