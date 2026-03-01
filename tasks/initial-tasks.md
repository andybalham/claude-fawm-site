# MP3 Static Website Generator — Implementation Task List

> Hand this file to Claude Code alongside `mp3-static-site-generator-spec.md`.  
> Work through tasks in order; each phase builds on the last.

---

## Phase 1 — Project Scaffolding

- [ ] **1.1** Initialise the project with `npm init` and create `package.json` with the fields:
  - `"name"`: `"mp3-site-generator"`
  - `"version"`: `"1.0.0"`
  - `"type"`: `"module"` (ESM)
  - `"engines"`: `{ "node": ">=18" }`
  - `"scripts"`: `{ "generate": "node generate.js", "test": "node --experimental-vm-modules node_modules/.bin/jest" }`

- [ ] **1.2** Install runtime dependencies:

  ```text
  npm install music-metadata ejs minimist slugify
  ```

- [ ] **1.3** Install dev dependencies:

  ```text
  npm install --save-dev jest
  ```

- [ ] **1.4** Create the following empty directory structure:

  ```text
  mp3-site-generator/
  ├── generate.js
  ├── src/
  │   ├── scanner.js
  │   ├── metadata.js
  │   ├── builder.js
  │   └── templates.js
  ├── assets/
  │   ├── style.css
  │   ├── player.js
  │   └── default-cover.jpg      ← a simple placeholder image (can be a solid-colour PNG/JPG)
  ├── tests/
  │   ├── fixtures/              ← test MP3 files go here (see test plan)
  │   ├── scanner.test.js
  │   ├── metadata.test.js
  │   ├── builder.test.js
  │   └── utils.test.js
  ├── jest.config.js
  └── README.md
  ```

- [ ] **1.5** Create `jest.config.js`:

  ```js
  export default {
    transform: {},
    testEnvironment: "node",
  };
  ```

---

## Phase 2 — CLI Entry Point (`generate.js`)

- [ ] **2.1** Parse `--input`, `--output`, and `--title` arguments using `minimist`.

- [ ] **2.2** Validate that `--input` and `--output` are provided; print usage and `process.exit(1)` if either is missing.

- [ ] **2.3** Validate that the `--input` path exists and is a directory; print a clear error and `process.exit(1)` if not.

- [ ] **2.4** If the `--output` directory already exists, delete it recursively and recreate it before writing output.

- [ ] **2.5** Orchestrate the full pipeline by calling, in order:
  1. `scanner.scanDirectory(inputPath)` → array of absolute MP3 file paths
  2. `metadata.extractAll(filePaths, inputPath)` → array of track objects
  3. `metadata.groupIntoAlbums(tracks)` → sorted album array
  4. `builder.buildSite(albums, outputPath, siteTitle)` → writes all files

- [ ] **2.6** Log progress at each step:
  - `"Scanning <inputPath> for MP3 files..."`
  - `"Found <n> MP3 files."`
  - `"Extracted metadata for <n> tracks across <n> albums."`
  - `"Site written to <outputPath>"`

- [ ] **2.7** Wrap the pipeline in a top-level `try/catch`; on unexpected error print the message and `process.exit(1)`.

---

## Phase 3 — MP3 Scanner (`src/scanner.js`)

- [ ] **3.1** Export an async function `scanDirectory(rootPath)` that returns a `Promise<string[]>` of absolute paths.

- [ ] **3.2** Use `fs.readdir` with `{ withFileTypes: true }` to list directory entries.

- [ ] **3.3** Recurse into subdirectories; skip any entry whose name starts with `.`.

- [ ] **3.4** Collect files whose name ends with `.mp3` (case-insensitive check).

- [ ] **3.5** Do not load all results into memory simultaneously — use an async generator or sequential recursion that yields/pushes results incrementally.

---

## Phase 4 — Metadata Extraction (`src/metadata.js`)

- [ ] **4.1** Export an async function `extractTrack(absolutePath, inputRoot)` that returns a single track object conforming to the data model in the spec.

- [ ] **4.2** Use `music-metadata`'s `parseFile()` to read tags.

- [ ] **4.3** Apply all fallbacks from the spec when tags are missing or empty strings.

- [ ] **4.4** Compute `duration` as a `"M:SS"` formatted string from `format.duration` (e.g. `"3:07"`). If duration is unavailable, use `"–"`.

- [ ] **4.5** Compute `filePath` as the relative path from `inputRoot` prefixed with `music/` (e.g. `music/Rock/Artist/album/track.mp3`).

- [ ] **4.6** Generate `slug` for the track title using `slugify`.

- [ ] **4.7** On any error from `parseFile()`, log `WARN: Could not read metadata for <path>: <error message>` and return a track object with all fallbacks applied.

- [ ] **4.8** Export an async function `extractAll(filePaths, inputRoot)` that maps `extractTrack` over all paths and returns the resolved array.

- [ ] **4.9** Export a pure function `groupIntoAlbums(tracks)` that:
  - Groups by `(album + '|' + artist)` key.
  - For each group, extracts the album-level fields (`name`, `artist`, `year`, `coverImage`, `slug`).
  - Sorts tracks within each album: numbered tracks first (ascending), then unnumbered tracks alphabetically.
  - Sorts albums alphabetically by name, with `"Untitled"` forced to the end.
  - Returns the album array.

- [ ] **4.10** Export a pure helper `formatDuration(seconds)` that converts a number of seconds to `"M:SS"`.

- [ ] **4.11** Export a pure helper `makeSlug(text)` wrapping `slugify` with consistent options `{ lower: true, strict: true }`.

---

## Phase 5 — Site Builder (`src/builder.js`)

- [ ] **5.1** Export an async function `buildSite(albums, outputPath, siteTitle)` that orchestrates all output.

- [ ] **5.2** Create output subdirectories: `albums/`, `covers/`, `music/`, `assets/`.

- [ ] **5.3** Copy `assets/style.css`, `assets/player.js`, and `assets/default-cover.jpg` to `<o>/assets/`.

- [ ] **5.4** For each album, copy the cover image (extracted from track metadata picture buffer) to `<o>/covers/<album-slug>.jpg`. If no picture is present, copy `assets/default-cover.jpg` to `<o>/covers/<album-slug>.jpg` instead.

- [ ] **5.5** Copy every MP3 file from its source path to `<o>/music/<relative-path>`, creating intermediate directories as needed.

- [ ] **5.6** Generate `<o>/index.html` using `templates.renderIndex(albums, siteTitle)`.

- [ ] **5.7** For each album, generate `<o>/albums/<album-slug>.html` using `templates.renderAlbum(album, siteTitle)`.

- [ ] **5.8** Log `"Writing album page: <slug>"` for each album page written.

---

## Phase 6 — Templates (`src/templates.js`)

- [ ] **6.1** Export a pure function `renderIndex(albums, siteTitle)` → HTML string.

  The index page must include:
  - A `<header>` with `siteTitle` as the `<h1>`.
  - A `<input type="search">` with `id="search"` for real-time filtering.
  - A `<main>` containing a `<div class="album-grid">` with one `<a class="album-card">` per album.
  - Each card must have `data-name` and `data-artist` attributes (used by the search JS).
  - An inline `<script>` that filters cards by comparing the search input value against `data-name` and `data-artist`.
  - A `<link>` to `assets/style.css`.

- [ ] **6.2** Export a pure function `renderAlbum(album, siteTitle)` → HTML string.

  The album page must include:
  - A `<header>` with album name, artist, year, track count, and total duration.
  - A large cover image.
  - A `<table class="track-list">` or `<ol class="track-list">` where each row has:
    - Track number cell (empty if null).
    - Title cell.
    - Duration cell.
    - A `<button class="btn-play" data-src="...">` with the relative MP3 path.
    - An `<a class="btn-download" href="..." download>` link.
  - A sticky `<div id="player">` at the bottom with an `<audio id="audio-el">` element and all custom player controls.
  - A `<script>` block that embeds the album's track list as a JSON array in a variable named `window.TRACKS`.
  - `<link>` to `../assets/style.css` and `<script src="../assets/player.js">`.
  - A `<a href="../index.html">← Back to all albums</a>` link.

- [ ] **6.3** Calculate total album duration in `renderAlbum` and display as `"Xh Ym"` or `"Xm Ys"` as appropriate.

---

## Phase 7 — Styles (`assets/style.css`)

- [ ] **7.1** Define CSS custom properties (variables) for the colour palette at `:root` so theming is centralised.

- [ ] **7.2** Style the album card grid with CSS Grid: `repeat(auto-fill, minmax(180px, 1fr))` for automatic responsive reflowing.

- [ ] **7.3** Style `.album-card` with a cover image, hover elevation effect (`box-shadow` / `transform: translateY`), and text truncation for long names.

- [ ] **7.4** Style the track list table with alternating row backgrounds and a highlight on hover.

- [ ] **7.5** Style the sticky `#player` bar:
  - Fixed to the bottom of the viewport.
  - Full width.
  - Contains: track info on the left, transport controls in the centre, volume on the right.
  - Add `padding-bottom` to `<main>` equal to the player height so content is not obscured.

- [ ] **7.6** Add responsive breakpoints:
  - `@media (max-width: 600px)`: single-column grid, simplified player layout, hide track number column.
  - `@media (min-width: 601px) and (max-width: 1024px)`: 2–3 column grid.

- [ ] **7.7** Style play and download buttons with distinct visual treatments (e.g. filled vs outlined, different accent colours or Unicode icons ▶ ⬇).

---

## Phase 8 — Audio Player (`assets/player.js`)

- [ ] **8.1** On `DOMContentLoaded`, read `window.TRACKS` and build an internal playlist array.

- [ ] **8.2** Track current index in a module-scoped variable `let currentIndex = 0`.

- [ ] **8.3** Implement `loadTrack(index)`:
  - Sets `audio.src` to the track's `src`.
  - Updates the displayed track name and artist in `#player`.
  - Highlights the active row in `.track-list`.

- [ ] **8.4** Implement `playTrack(index)`: calls `loadTrack`, then `audio.play()`.

- [ ] **8.5** Wire each `.btn-play` button's `click` event to find the track by `data-src` and call `playTrack`.

- [ ] **8.6** Wire the `#btn-prev` and `#btn-next` controls to decrement/increment `currentIndex` (with wrapping) and call `playTrack`.

- [ ] **8.7** Listen to `audio.ended` and auto-advance to the next track (stop at end of playlist or loop — developer's choice, document it).

- [ ] **8.8** Sync the seek bar (`<input type="range" id="seek">`) with `audio.timeupdate` and allow scrubbing on `input` event.

- [ ] **8.9** Display `currentTime` and `duration` in `"M:SS / M:SS"` format in a `<span id="time-display">`.

- [ ] **8.10** Wire the volume control (`<input type="range" id="volume">`) to `audio.volume`.

- [ ] **8.11** Implement a play/pause toggle button (`#btn-playpause`) that toggles `audio.play()` / `audio.pause()` and updates its label/icon.

---

## Phase 9 — README & Final Polish

- [ ] **9.1** Write `README.md` covering:
  - Prerequisites (Node.js v18+).
  - Installation (`npm install`).
  - Usage examples with all CLI flags.
  - Output structure description.
  - How to serve locally (e.g. `npx serve ./site`).
  - Known limitations (e.g. very large libraries, browser autoplay policies).

- [ ] **9.2** Do a final end-to-end test run against a real folder of MP3s and verify:
  - All pages open without console errors.
  - Audio plays and the player controls work.
  - Search filters correctly on the index page.
  - The site looks correct on a mobile viewport (Chrome DevTools device emulation).
