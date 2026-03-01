import minimist from "minimist";
import fs from "fs/promises";
import path from "path";
import { scanDirectory } from "./src/scanner.js";
import { extractAll, groupIntoAlbums } from "./src/metadata.js";
import { buildSite } from "./src/builder.js";

const argv = minimist(process.argv.slice(2));

const inputPath = argv.input;
const outputPath = argv.output;
const siteTitle = argv.title || "My Music Library";

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node generate.js --input <path> --output <path> [--title <title>]"
  );
  process.exit(1);
}

try {
  const inputStat = await fs.stat(inputPath);
  if (!inputStat.isDirectory()) {
    console.error(`Error: --input path is not a directory: ${inputPath}`);
    process.exit(1);
  }
} catch {
  console.error(`Error: --input path does not exist: ${inputPath}`);
  process.exit(1);
}

try {
  // Clean output directory if it exists
  try {
    await fs.rm(outputPath, { recursive: true, force: true });
  } catch {
    // ignore if doesn't exist
  }
  await fs.mkdir(outputPath, { recursive: true });

  // Step 1: Scan
  const resolvedInput = path.resolve(inputPath);
  console.log(`Scanning ${resolvedInput} for MP3 files...`);
  const filePaths = await scanDirectory(resolvedInput);
  console.log(`Found ${filePaths.length} MP3 files.`);

  if (filePaths.length === 0) {
    console.log("No MP3 files found. Generating empty site.");
  }

  // Step 2: Extract metadata
  const tracks = await extractAll(filePaths, resolvedInput);
  const albums = groupIntoAlbums(tracks);
  console.log(
    `Extracted metadata for ${tracks.length} tracks across ${albums.length} albums.`
  );

  // Step 3: Build site
  const resolvedOutput = path.resolve(outputPath);
  await buildSite(albums, resolvedOutput, siteTitle);
  console.log(`Site written to ${resolvedOutput}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
