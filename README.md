# MP3 Static Website Generator

A Node.js CLI tool that scans folders for MP3 files, reads ID3 metadata, and generates a self-contained static website for browsing, playing, and downloading music.

## Prerequisites

- Node.js v18 or later

## Installation

```bash
npm install
```

## Usage

```bash
# Basic usage
npm run generate -- --input ./music --output ./site

# With custom title
npm run generate -- --input /path/to/mp3s --output ./site --title "My Music Collection"

# Or directly
node generate.js --input ./music --output ./site --title "Jane's Music"
```

### CLI Arguments

| Argument   | Required | Description                                |
| ---------- | -------- | ------------------------------------------ |
| `--input`  | Yes      | Path to the folder containing MP3 files    |
| `--output` | Yes      | Path where the static site will be written |
| `--title`  | No       | Site title (default: "My Music Library")   |

## Output Structure

```
<output>/
├── index.html              ← Album grid with search/filter
├── albums/<slug>.html      ← Per-album page with audio player
├── covers/<slug>.jpg       ← Extracted album art
├── music/                  ← MP3 files (mirrored structure)
└── assets/
    ├── style.css
    └── player.js
```

## Serving Locally

The generated site is plain HTML/CSS/JS with no server required. Open `index.html` directly, or use a local server:

```bash
npx serve ./site
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

- Very large libraries (10,000+ files) may take a while to process due to file copying
- Browser autoplay policies may require a user click before audio starts
- Cover art is extracted from the first track in each album that has embedded art
