# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MP3 Static Website Generator — a Node.js CLI app that scans folders for MP3 files, reads ID3 metadata, and generates a self-contained static website for browsing, playing, and downloading music. Output is plain HTML/CSS/JS with zero runtime dependencies.

## Commands

```bash
# Install dependencies
npm install

# Generate the site (reads from docs/music, outputs to docs/)
npm run generate -- --title "Site Title"
```

## Architecture

**Entry point:** `generate.js` — CLI argument parsing (minimist), orchestrates the pipeline.

**Source modules (`src/`):**

- `scanner.js` — Recursive MP3 file discovery (ignores hidden files/folders, case-insensitive `.mp3` matching)
- `metadata.js` — ID3 tag reading via `music-metadata`, with fallbacks (filename for title, "Unknown Artist", "Untitled" album)
- `builder.js` — HTML generation and asset copying (cover art, CSS/JS)
- `templates.js` (or `templates/` with `.ejs` files) — EJS page templates

**Frontend assets (`assets/`):**

- `style.css` — All site styles (no external CDN)
- `player.js` — HTML5 audio player with playlist navigation, auto-advance

**Generated output structure (`docs/`):**

```text
docs/
├── index.html           ← Album grid with search/filter
├── albums/<slug>.html   ← Per-album page with track list + audio player
├── covers/<slug>.jpg    ← Extracted album art (or default.jpg placeholder)
├── music/               ← Source MP3 files (not copied, read in place)
└── assets/              ← style.css + player.js
```

## Key Conventions

- **Async/await** throughout — no callback-style async
- **Album grouping key:** `album + artist` (same album name with different artists = separate albums)
- **Slugs:** lowercase, hyphens for spaces, special characters removed (use `slugify` package)
- **Sort order:** Albums alphabetically ("Untitled" last); tracks by track number then title
- **Streaming:** Process files in streams to handle 1,000+ MP3 libraries without memory issues
- **Error resilience:** Warn on metadata failures, don't crash; exit non-zero only on critical errors (e.g., missing input dir)

## Dependencies

- `music-metadata` — MP3 ID3 tag reading
- `ejs` — HTML templating
- `minimist` — CLI argument parsing
- `slugify` — URL-safe slug generation

## Requirements

Full specification is in `requirements/initial-requirements.md`.
