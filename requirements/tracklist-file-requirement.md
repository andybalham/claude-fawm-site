# Tracklist Ordering Feature — Requirement Specification

> This document extends `mp3-static-site-generator-spec.md`.  
> Implement these requirements alongside the existing spec. Where they conflict, this document takes precedence.

---

## Overview

Albums frequently lack track number metadata. To give users a simple, editor-friendly way to control track ordering, the generator will use a `tracklist.txt` sidecar file inside each album folder. If no such file exists the generator creates one automatically using alphabetical ordering, ready for the user to edit and regenerate.

---

## What is `tracklist.txt`?

A plain UTF-8 text file named exactly `tracklist.txt` placed inside a folder that contains MP3 files. Each non-empty, non-comment line contains the filename of one MP3 in the desired playback order.

### Example

Given a folder `music/Jazz/Miles Davis/Kind of Blue/` containing:

```
so_what.mp3
freddie_freeloader.mp3
blue_in_green.mp3
all_blues.mp3
flamenco_sketches.mp3
```

The generator creates (or the user edits) `tracklist.txt` as:

```
# Kind of Blue — track order
# Edit this file and re-run the generator to change the order.

so_what.mp3
freddie_freeloader.mp3
blue_in_green.mp3
all_blues.mp3
flamenco_sketches.mp3
```

Reordering is as simple as moving lines around and rerunning the generator.

---

## Detailed Requirements

### 1. Discovery — which folders get a `tracklist.txt`

- A "music folder" is any directory that contains at least one `.mp3` file (case-insensitive).
- Every music folder must have a `tracklist.txt` by the time site generation runs.
- `tracklist.txt` files are only created or updated during a dedicated **pre-generation pass** that runs before metadata extraction. The main generation pipeline then always reads from the file.

---

### 2. Pre-Generation Pass

Before the main pipeline runs, the generator must execute a pre-generation pass over the entire input tree:

- [ ] **P.1** Recursively walk the input directory and identify every music folder (any folder containing at least one `.mp3` file, case-insensitive).

- [ ] **P.2** For each music folder, check whether a `tracklist.txt` already exists in that folder.

- [ ] **P.3** If `tracklist.txt` does **not** exist:
  - Collect all `.mp3` filenames in that folder (not subdirectories — filenames only, not paths).
  - Sort them alphabetically (case-insensitive, locale-aware using `localeCompare`).
  - Write a new `tracklist.txt` to that folder using the format described in Section 4.
  - Log to the console: `"Created tracklist.txt in <relative folder path>"`.

- [ ] **P.4** If `tracklist.txt` **does** exist:
  - Read its contents.
  - Parse the effective filenames (see Section 3).
  - Identify any `.mp3` files present in the folder that are **not** listed in the file (new files added since the last run).
  - If any unlisted files are found, **append** them to the end of the existing `tracklist.txt` in alphabetical order, separated from the existing content by a blank line and the comment `# Added automatically — move these lines to set their order`.
  - Log to the console: `"Updated tracklist.txt in <relative folder path> — added <n> new file(s)"`.
  - If no unlisted files are found, leave the file untouched.

- [ ] **P.5** Files listed in `tracklist.txt` that no longer exist on disk should be **ignored silently** during ordering (not deleted from the file, so the user's edits are preserved if a file is temporarily missing).

---

### 3. Parsing `tracklist.txt`

The parser must handle the following rules:

- [ ] **T.1** Lines beginning with `#` (after optional leading whitespace) are **comments** and must be ignored entirely.

- [ ] **T.2** Blank lines (empty or whitespace-only) must be ignored.

- [ ] **T.3** Each remaining line is treated as a filename. Leading and trailing whitespace must be trimmed.

- [ ] **T.4** Filename matching against actual files on disk must be **case-insensitive** to accommodate different operating systems.

- [ ] **T.5** The order of valid, on-disk filenames as they appear in the file (top to bottom) defines the track order: the first listed file is track 1, the second is track 2, and so on.

- [ ] **T.6** The parser must export a function `parseTracklist(filePath)` that returns an ordered array of filename strings (excluding comments, blanks, and missing files).

---

### 4. `tracklist.txt` File Format (for generated files)

When the generator writes a new `tracklist.txt` it must use this format:

```
# <folder name> — track order
# Edit this file and re-run the generator to change the playing order.
# Lines starting with # are comments and are ignored.
# Blank lines are ignored.

filename-one.mp3
filename-two.mp3
filename-three.mp3
```

Rules:

- The first comment line uses the **folder name** (not the full path) as the title.
- There is exactly one blank line between the header comments and the first filename.
- Filenames are listed one per line with no leading whitespace.
- The file is encoded as **UTF-8** with Unix line endings (`\n`).
- No trailing newline variations — end the file with a single `\n` after the last filename.

---

### 5. Integration with the Main Pipeline

- [ ] **I.1** The metadata extraction step (`extractAll` / `extractTrack`) must accept the ordered filename list from `tracklist.txt` and assign `trackNumber` values (1-based integers) accordingly, rather than reading track numbers from ID3 tags.

- [ ] **I.2** ID3 track number tags must be **ignored entirely** for ordering purposes. The `tracklist.txt` order is always authoritative.

- [ ] **I.3** If a music folder contains MP3 files across multiple subdirectories, each subdirectory is treated as its own independent music folder with its own `tracklist.txt`. The ordering scope is always a single flat folder, never recursive.

- [ ] **I.4** The `groupIntoAlbums` function must preserve the track order as determined by `tracklist.txt`. It must not re-sort tracks alphabetically or by any other criterion once `trackNumber` values have been assigned.

- [ ] **I.5** The album page in the generated site must display tracks in `trackNumber` order (ascending), which will naturally reflect the `tracklist.txt` order.

---

### 6. New Module — `src/tracklist.js`

All tracklist logic must be implemented in a dedicated module with the following exports:

```js
// Find all music folders under rootPath and ensure each has a tracklist.txt.
// Creates new files and appends missing entries to existing ones.
// Returns a summary: { created: number, updated: number, unchanged: number }
export async function syncAllTracklists(rootPath) { ... }

// Parse a single tracklist.txt file. Returns an ordered array of filename strings
// that exist on disk. Missing files are silently excluded. Returns [] if the file
// cannot be read.
export async function parseTracklist(filePath) { ... }

// Write a new tracklist.txt to folderPath using the canonical format.
// filenames is a pre-sorted array of MP3 filename strings.
export async function writeTracklist(folderPath, filenames) { ... }

// Append newly discovered filenames to an existing tracklist.txt.
export async function appendToTracklist(filePath, newFilenames) { ... }
```

---

### 7. CLI Integration

- [ ] **C.1** The pre-generation pass (`syncAllTracklists`) must run **before** `scanDirectory` is called, so that `tracklist.txt` files are always present and up to date when the main pipeline reads them.

- [ ] **C.2** Add a standalone `--sync-only` flag. When passed, the generator runs only the pre-generation pass and exits without generating the site. This lets users review and edit the generated `tracklist.txt` files before committing to a full site build.

  ```bash
  node generate.js --input ./music --sync-only
  ```

  Output should summarise what was done:

  ```
  Tracklist sync complete.
    Created: 4
    Updated: 1
    Unchanged: 12
  ```

- [ ] **C.3** During a normal run (without `--sync-only`), log a single summary line after the pre-generation pass:
  ```
  Tracklists synced (4 created, 1 updated, 12 unchanged). Proceeding with site generation...
  ```

---

### 8. Error Handling

- [ ] **E.1** If `tracklist.txt` exists but cannot be read (permissions error, etc.), log a warning and fall back to alphabetical ordering for that folder. Do not abort the entire build.

- [ ] **E.2** If writing a new `tracklist.txt` fails, log a warning including the folder path and the error message. Do not abort the build; proceed with alphabetical ordering for that folder.

- [ ] **E.3** If `tracklist.txt` contains no valid, on-disk filenames after parsing (e.g. all entries refer to deleted files), log a warning and fall back to alphabetical ordering for that folder.

---

### 9. Updated `README.md` Sections

Add a **"Track Ordering"** section to `README.md` that explains:

- What `tracklist.txt` is and where it lives.
- That it is created automatically on first run.
- How to reorder tracks (edit the file, move lines, rerun the generator).
- The `--sync-only` flag and when to use it.
- The comment syntax.
- What happens when new MP3 files are added to an existing folder.
