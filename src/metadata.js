import { parseFile } from "music-metadata";
import path from "path";
import slugify from "slugify";
import { parseTracklist } from "./tracklist.js";

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
 * Extract metadata for all MP3 files, applying tracklist ordering.
 */
export async function extractAll(filePaths, inputRoot) {
  const tracks = [];
  for (const fp of filePaths) {
    const track = await extractTrack(fp, inputRoot);
    tracks.push(track);
  }

  // Group tracks by their source folder and apply tracklist ordering
  const folderTracks = new Map();
  for (const track of tracks) {
    const folder = path.dirname(track.sourceAbsPath);
    if (!folderTracks.has(folder)) folderTracks.set(folder, []);
    folderTracks.get(folder).push(track);
  }

  for (const [folder, folderTrackList] of folderTracks) {
    const tracklistPath = path.join(folder, "tracklist.txt");
    const ordered = await parseTracklist(tracklistPath);

    if (ordered.length > 0) {
      // Build order map: filename (lowercase) -> 1-based position
      const orderMap = new Map();
      for (let i = 0; i < ordered.length; i++) {
        orderMap.set(ordered[i].toLowerCase(), i + 1);
      }
      for (const track of folderTrackList) {
        const filename = path.basename(track.sourceAbsPath).toLowerCase();
        track.trackNumber = orderMap.get(filename) || folderTrackList.length + 1;
      }
    } else {
      // Fallback: alphabetical by filename
      console.warn(`WARN: No valid tracklist for ${folder}, using alphabetical order.`);
      const sorted = [...folderTrackList].sort((a, b) =>
        path.basename(a.sourceAbsPath).localeCompare(path.basename(b.sourceAbsPath))
      );
      sorted.forEach((track, i) => {
        track.trackNumber = i + 1;
      });
    }
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
    album.tracks.sort((a, b) => a.trackNumber - b.trackNumber);

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
