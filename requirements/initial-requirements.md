# MP3 Static Website Generator — Requirement Specification

## Overview

Build a Node.js command-line application that recursively scans a folder for MP3 files, reads their ID3 tag metadata, and generates a modern, responsive static website for browsing, playing, and downloading the music.

---

## Technology Stack

- **Runtime:** Node.js (v18+)
- **MP3 Tag Reading:** `music-metadata` npm package
- **HTML Templating:** `ejs` npm package (or plain template literals — developer's choice)
- **File System:** Node.js built-in `fs` and `path` modules
- **No build tools required** — output must be plain HTML, CSS, and JS files with zero runtime dependencies

---

## CLI Interface

The application should be invoked from the command line as follows:

```bash
node generate.js --input ./music --output ./site
```

### Arguments

| Argument   | Required | Description                                                         |
| ---------- | -------- | ------------------------------------------------------------------- |
| `--input`  | Yes      | Path to the root folder containing MP3 files (searched recursively) |
| `--output` | Yes      | Path to the folder where the static site will be written            |
| `--title`  | No       | Title of the website (default: `"My Music Library"`)                |

---

## Core Functional Requirements

### 1. MP3 Discovery

- Recursively walk the `--input` directory tree.
- Collect all files with a `.mp3` extension (case-insensitive).
- Ignore hidden files and folders (names beginning with `.`).

### 2. Metadata Extraction

For each MP3 file, attempt to read the following ID3 tags using the `music-metadata` library:

| Tag Field           | Fallback if Missing             |
| ------------------- | ------------------------------- |
| `common.title`      | Filename without extension      |
| `common.artist`     | `"Unknown Artist"`              |
| `common.album`      | `"Untitled"`                    |
| `common.year`       | `null` (omit from display)      |
| `common.track.no`   | `null` (omit from display)      |
| `common.picture[0]` | Use a default placeholder image |

If metadata reading throws an error for a file, log a warning to the console and apply all fallbacks for that file.

### 3. Data Model

After scanning, organise tracks into albums. The internal data structure should look like:

```json
{
  "albums": [
    {
      "name": "Album Name",
      "artist": "Artist Name",
      "year": 2021,
      "coverImage": "covers/album-slug.jpg",
      "slug": "album-slug",
      "tracks": [
        {
          "trackNumber": 1,
          "title": "Song Title",
          "artist": "Track Artist",
          "duration": "3:45",
          "filePath": "music/relative/path/to/file.mp3",
          "slug": "song-slug"
        }
      ]
    }
  ]
}
```

- **Album grouping key:** `common.album` value (or `"Untitled"` if absent).
- **Tracks within an album** should be sorted by track number ascending, then alphabetically by title for tracks with no number.
- **Albums** should be sorted alphabetically by album name, with `"Untitled"` appearing last.
- **Slugs** should be URL-safe: lowercase, spaces replaced with hyphens, special characters removed.
- If two albums have the same name but different artists, treat them as separate albums (key on `album + artist`).

### 4. Asset Copying

- Copy all MP3 files into `<output>/music/` preserving relative paths from the input root.
- Extract embedded cover art (if present) and save as `<output>/covers/<album-slug>.jpg`.
- If no cover art is found for an album, copy a bundled default placeholder image to `<output>/covers/default.jpg`.
- Copy all CSS and JS assets into `<output>/assets/`.

---

## Static Site Structure

```text
<output>/
├── index.html              ← Album index page
├── albums/
│   ├── <album-slug>.html   ← One page per album
│   └── ...
├── covers/
│   ├── <album-slug>.jpg
│   └── default.jpg
├── music/
│   └── (MP3 files, mirrored structure)
└── assets/
    ├── style.css
    └── player.js
```

---

## Page Requirements

### 5. Index Page (`index.html`)

- Displays a **grid of album cards**.
- Each card contains:
  - Album cover art (or placeholder).
  - Album name (bold).
  - Artist name.
  - Year (if available).
  - Track count (e.g. "12 tracks").
  - Clicking the card navigates to the album page.
- A **search/filter input** at the top that filters album cards in real time by album name or artist (client-side JS, no server required).
- Page title and a simple site header using the `--title` argument value.

### 6. Album Page (`albums/<album-slug>.html`)

- Displays album header:
  - Cover art (large).
  - Album name, artist, year, total track count, total duration.
- Displays a **track listing table/list** with columns:
  - Track number (if available).
  - Title.
  - Duration.
  - **Play button** — loads the track into the on-page audio player.
  - **Download button/link** — triggers a file download.
- An **HTML5 `<audio>` player** fixed or sticky at the bottom of the page:
  - Shows currently playing track name and artist.
  - Standard controls: play/pause, seek bar, volume, current time / total time.
  - **Previous** and **Next** track buttons to navigate the album playlist.
  - Autoplay next track when the current one finishes.
- A **back link** to `../index.html`.

---

## Design & UX Requirements

### 7. Responsive Design

- Must be fully responsive and usable on mobile phones (min width 320px) and desktop (up to 1920px).
- Use CSS Grid or Flexbox for layout.
- Album card grid should reflow: 1 column on mobile, 2–3 on tablet, 4+ on desktop.
- The sticky audio player must not obscure track list content (add appropriate bottom padding).

### 8. Visual Design

- **Modern and attractive** dark or light theme (developer's choice, but must be consistent and polished).
- Clean sans-serif typography.
- Subtle hover effects on interactive elements (cards, buttons, track rows).
- Cover art images should use `object-fit: cover` to maintain a consistent aspect ratio.
- Colour-coded or icon-based play/pause and download buttons for clear affordance.
- No external CDN dependencies — all CSS and JS must be self-contained in `assets/`.

---

## Non-Functional Requirements

### 9. Performance

- The generator should handle libraries of at least 1,000 MP3 files without running out of memory (process files in streams where possible).
- HTML output should be minified (or at minimum, cleanly formatted and load quickly in browser).

### 10. Error Handling & Logging

- Log progress to the console: files scanned, albums found, pages generated.
- Warn (do not crash) when a file cannot be read or metadata extraction fails.
- If the `--output` directory already exists, overwrite it cleanly (or prompt the user — developer's choice).
- Exit with a non-zero code and clear message if `--input` does not exist.

### 11. Code Quality

- Use `async/await` throughout (no callback-style async).
- Separate concerns into modules: `scanner.js`, `metadata.js`, `builder.js`, `templates.js`.
- Include a `README.md` in the project root with setup and usage instructions.
- Include a `package.json` with all dependencies and a `"generate"` npm script.

---

## Dependencies (suggested)

```json
{
  "dependencies": {
    "music-metadata": "^10.x",
    "ejs": "^3.x",
    "minimist": "^1.x",
    "slugify": "^1.x"
  }
}
```

---

## Deliverables

1. `generate.js` — entry point
2. `src/scanner.js` — recursive MP3 file discovery
3. `src/metadata.js` — tag reading and normalisation
4. `src/builder.js` — HTML generation and asset copying
5. `src/templates.js` (or `templates/` folder with `.ejs` files) — page templates
6. `assets/style.css` — all site styles
7. `assets/player.js` — audio player logic
8. `package.json`
9. `README.md`

---

## Example Usage

```bash
# Install dependencies
npm install

# Generate the site
npm run generate -- --input /path/to/mp3s --output /path/to/site --title "Jane's Music"

# Open in browser
open /path/to/site/index.html
```
