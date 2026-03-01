# MP3 Static Website Generator

A Node.js CLI tool that scans `docs/music/` for MP3 files, reads ID3 metadata, and generates a self-contained static website in `docs/` for browsing, playing, and downloading music.

## Prerequisites

- Node.js v18 or later

## Installation

```bash
npm install
```

## Usage

Place MP3 files in `docs/music/` (subdirectories are supported), then run:

```bash
# Generate with default title
npm run generate

# With custom title
npm run generate -- --title "My Music Collection"
```

### CLI Arguments

| Argument  | Required | Description                              |
| --------- | -------- | ---------------------------------------- |
| `--title` | No       | Site title (default: "My Music Library") |

## Output Structure

```
docs/
├── index.html              ← Album grid with search/filter
├── albums/<slug>.html      ← Per-album page with audio player
├── covers/<slug>.jpg       ← Extracted album art
├── music/                  ← Source MP3 files (read in place)
└── assets/
    ├── style.css
    └── player.js
```

## Serving Locally

The generated site is plain HTML/CSS/JS with no server required. Open `docs/index.html` directly, or use a local server:

```bash
npx serve ./docs
```

## Features

- Recursive MP3 discovery with ID3 metadata reading
- Album grouping with cover art extraction
- Responsive dark-themed UI
- Real-time search/filter on the index page
- HTML5 audio player with playlist navigation
- Previous/Next track, seek bar, volume control
- Auto-advance to next track when current finishes
- Download links for individual tracks

## Known Limitations

- Very large libraries (10,000+ files) may take a while to process
- Browser autoplay policies may require a user click before audio starts
- Cover art is extracted from the first track in each album that has embedded art
