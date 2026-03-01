import { parseFile } from "music-metadata";
import path from "path";
import slugify from "slugify";

/**
 * Create a URL-safe slug from text.
 */
export function makeSlug(text) {
  return slugify(text, { lower: true, strict: true });
}

/**
 * Format seconds into "M:SS" string.
 */
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return "\u2013";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract metadata from a single MP3 file.
 */
export async function extractTrack(absolutePath, inputRoot) {
  const filename = path.basename(absolutePath, ".mp3");
  const relativePath = path.relative(inputRoot, absolutePath).replace(/\\/g, "/");

  let metadata = null;
  try {
    metadata = await parseFile(absolutePath);
  } catch (err) {
    console.warn(`WARN: Could not read metadata for ${absolutePath}: ${err.message}`);
  }

  const common = metadata?.common || {};
  const format = metadata?.format || {};

  const title = common.title || filename;
  const artist = common.artist || "Unknown Artist";
  const album = common.album || "Untitled";
  const year = common.year || null;
  const trackNumber = common.track?.no || null;
  const duration = format.duration ? formatDuration(format.duration) : "\u2013";
  const durationSeconds = format.duration || 0;
  const picture = common.picture?.[0] || null;

  return {
    title,
    artist,
    album,
    year,
    trackNumber,
    duration,
    durationSeconds,
    filePath: `music/${relativePath}`,
    slug: makeSlug(title),
    picture,
    sourceAbsPath: absolutePath,
  };
}

/**
 * Extract metadata for all MP3 files.
 */
export async function extractAll(filePaths, inputRoot) {
  const tracks = [];
  for (const fp of filePaths) {
    const track = await extractTrack(fp, inputRoot);
    tracks.push(track);
  }
  return tracks;
}

/**
 * Group tracks into sorted album objects.
 */
export function groupIntoAlbums(tracks) {
  const albumMap = new Map();

  for (const track of tracks) {
    const key = `${track.album}|${track.artist}`;
    if (!albumMap.has(key)) {
      albumMap.set(key, {
        name: track.album,
        artist: track.artist,
        year: track.year,
        slug: makeSlug(`${track.album}-${track.artist}`),
        coverImage: null,
        picture: null,
        tracks: [],
      });
    }
    const album = albumMap.get(key);
    album.tracks.push(track);

    // Use first available year
    if (!album.year && track.year) {
      album.year = track.year;
    }

    // Use first available picture
    if (!album.picture && track.picture) {
      album.picture = track.picture;
    }
  }

  // Sort tracks within each album
  for (const album of albumMap.values()) {
    album.tracks.sort((a, b) => {
      // Numbered tracks first, ascending
      if (a.trackNumber != null && b.trackNumber != null) {
        return a.trackNumber - b.trackNumber;
      }
      if (a.trackNumber != null) return -1;
      if (b.trackNumber != null) return 1;
      // Then alphabetically by title
      return a.title.localeCompare(b.title);
    });

    // Set cover image path
    album.coverImage = `covers/${album.slug}.jpg`;
  }

  // Sort albums alphabetically, "Untitled" last
  const albums = Array.from(albumMap.values());
  albums.sort((a, b) => {
    if (a.name === "Untitled" && b.name !== "Untitled") return 1;
    if (b.name === "Untitled" && a.name !== "Untitled") return -1;
    return a.name.localeCompare(b.name);
  });

  return albums;
}
