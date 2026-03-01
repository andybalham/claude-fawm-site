import minimist from "minimist";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scanDirectory } from "./src/scanner.js";
import { extractAll, groupIntoAlbums } from "./src/metadata.js";
import { buildSite } from "./src/builder.js";
import { syncAllTracklists } from "./src/tracklist.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2));
const siteTitle = argv.title || "My Music Library";
const syncOnly = argv["sync-only"] || false;

const inputPath = path.resolve(__dirname, "docs", "music");
const outputPath = path.resolve(__dirname, "docs");

try {
  const inputStat = await fs.stat(inputPath);
  if (!inputStat.isDirectory()) {
    console.error(`Error: input path is not a directory: ${inputPath}`);
    process.exit(1);
  }
} catch {
  console.error(`Error: input path does not exist: ${inputPath}`);
  console.error("Create a docs/music/ folder and add MP3 files to it.");
  process.exit(1);
}

try {
  // Step 0: Sync tracklists
  const summary = await syncAllTracklists(inputPath);
  console.log(
    `Tracklists synced (${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged).`
  );

  if (syncOnly) {
    console.log("Sync-only mode — skipping site generation.");
    process.exit(0);
  }

  console.log("Proceeding with site generation...");

  // Clean generated output (but NOT docs/music which is the source)
  const generatedDirs = ["albums", "covers", "assets"].map((d) =>
    path.join(outputPath, d)
  );
  for (const dir of generatedDirs) {
    await fs.rm(dir, { recursive: true, force: true });
  }
  // Remove generated index.html if it exists
  await fs.rm(path.join(outputPath, "index.html"), { force: true });

  // Ensure output subdirectories exist
  await fs.mkdir(outputPath, { recursive: true });

  // Step 1: Scan
  console.log(`Scanning ${inputPath} for MP3 files...`);
  const filePaths = await scanDirectory(inputPath);
  console.log(`Found ${filePaths.length} MP3 files.`);

  if (filePaths.length === 0) {
    console.log("No MP3 files found. Generating empty site.");
  }

  // Step 2: Extract metadata
  const tracks = await extractAll(filePaths, inputPath);
  const albums = groupIntoAlbums(tracks);
  console.log(
    `Extracted metadata for ${tracks.length} tracks across ${albums.length} albums.`
  );

  // Step 2.5: Apply album ordering from albumlist.txt
  const albumListPath = path.join(inputPath, "albumlist.txt");
  let albumListExists = false;
  try {
    await fs.access(albumListPath);
    albumListExists = true;
  } catch {}

  if (!albumListExists) {
    // Generate albumlist.txt from current album names
    const albumNames = albums.map((a) => a.name);
    await fs.writeFile(albumListPath, albumNames.join("\n") + "\n");
    console.log(`Generated albumlist.txt with ${albumNames.length} albums.`);
  } else {
    // Read albumlist.txt and reorder albums
    const content = await fs.readFile(albumListPath, "utf-8");
    const orderedNames = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const albumByName = new Map();
    for (const album of albums) {
      albumByName.set(album.name, album);
    }

    const ordered = [];
    for (const name of orderedNames) {
      const album = albumByName.get(name);
      if (album) {
        ordered.push(album);
        albumByName.delete(name);
      } else {
        console.warn(`WARN: Album "${name}" in albumlist.txt not found.`);
      }
    }
    // Append any albums not in the list
    for (const album of albumByName.values()) {
      console.warn(`WARN: Album "${album.name}" not in albumlist.txt, appending at end.`);
      ordered.push(album);
    }

    albums.length = 0;
    albums.push(...ordered);
    console.log(`Album order applied from albumlist.txt.`);
  }

  // Step 3: Build site
  await buildSite(albums, outputPath, siteTitle);
  console.log(`Site written to ${outputPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
