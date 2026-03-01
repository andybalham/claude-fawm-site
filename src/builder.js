import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { renderIndex, renderAlbum } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * Build the complete static site.
 */
export async function buildSite(albums, outputPath, siteTitle) {
  // Create output directories (music/ already exists as the source)
  await fs.mkdir(path.join(outputPath, "albums"), { recursive: true });
  await fs.mkdir(path.join(outputPath, "covers"), { recursive: true });
  await fs.mkdir(path.join(outputPath, "assets"), { recursive: true });

  // Copy static assets
  const assetsDir = path.join(PROJECT_ROOT, "assets");
  await fs.copyFile(
    path.join(assetsDir, "style.css"),
    path.join(outputPath, "assets", "style.css")
  );
  await fs.copyFile(
    path.join(assetsDir, "player.js"),
    path.join(outputPath, "assets", "player.js")
  );
  await fs.copyFile(
    path.join(assetsDir, "default-cover.jpg"),
    path.join(outputPath, "assets", "default-cover.jpg")
  );
  await fs.copyFile(
    path.join(assetsDir, "default-fawm-cover.jpg"),
    path.join(outputPath, "assets", "default-fawm-cover.jpg")
  );

  // Process each album: extract cover art
  for (const album of albums) {
    if (album.name.startsWith("FAWM")) {
      await fs.copyFile(
        path.join(assetsDir, "default-fawm-cover.jpg"),
        path.join(outputPath, album.coverImage)
      );
    } else if (album.picture) {
      await fs.writeFile(
        path.join(outputPath, album.coverImage),
        album.picture.data
      );
    } else {
      await fs.copyFile(
        path.join(assetsDir, "default-cover.jpg"),
        path.join(outputPath, album.coverImage)
      );
    }
  }

  // Generate index.html
  const indexHtml = renderIndex(albums, siteTitle);
  await fs.writeFile(path.join(outputPath, "index.html"), indexHtml);

  // Generate album pages
  for (const album of albums) {
    console.log(`Writing album page: ${album.slug}`);
    const albumHtml = renderAlbum(album, siteTitle);
    await fs.writeFile(
      path.join(outputPath, "albums", `${album.slug}.html`),
      albumHtml
    );
  }
}
