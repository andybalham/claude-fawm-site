import minimist from "minimist";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scanDirectory } from "./src/scanner.js";
import { extractAll, groupIntoAlbums } from "./src/metadata.js";
import { buildSite } from "./src/builder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2));
const siteTitle = argv.title || "My Music Library";

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

  // Step 3: Build site
  await buildSite(albums, outputPath, siteTitle);
  console.log(`Site written to ${outputPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
