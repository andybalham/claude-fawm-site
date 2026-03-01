import ejs from "ejs";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTotalDuration(tracks) {
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
  if (totalSeconds === 0) return "\u2013";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

const INDEX_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= siteTitle %></title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header class="site-header">
    <h1><%= siteTitle %></h1>
    <div class="search-wrapper">
      <input type="search" id="search" placeholder="Search albums or artists..." autocomplete="off">
    </div>
  </header>
  <main>
    <div class="album-grid">
      <% albums.forEach(function(album) { %>
      <a class="album-card" href="albums/<%= album.slug %>.html"
         data-name="<%= album.name.toLowerCase() %>"
         data-artist="<%= album.artist.toLowerCase() %>">
        <div class="album-cover">
          <img src="<%= album.coverImage %>" alt="<%= escapeHtml(album.name) %>" loading="lazy">
        </div>
        <div class="album-info">
          <strong class="album-name"><%= album.name %></strong>
          <span class="album-artist"><%= album.artist %></span>
          <span class="album-meta">
            <% if (album.year) { %><%= album.year %> &middot; <% } %>
            <%= album.tracks.length %> track<%= album.tracks.length !== 1 ? 's' : '' %>
          </span>
        </div>
      </a>
      <% }); %>
    </div>
    <% if (albums.length === 0) { %>
    <p class="empty-message">No albums found.</p>
    <% } %>
  </main>
  <script>
    (function() {
      var search = document.getElementById('search');
      var cards = document.querySelectorAll('.album-card');
      search.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        cards.forEach(function(card) {
          var name = card.getAttribute('data-name');
          var artist = card.getAttribute('data-artist');
          var match = !q || name.indexOf(q) !== -1 || artist.indexOf(q) !== -1;
          card.style.display = match ? '' : 'none';
        });
      });
    })();
  </script>
</body>
</html>`;

const ALBUM_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= album.name %> - <%= siteTitle %></title>
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body class="album-page">
  <header class="album-header">
    <a href="../index.html" class="back-link">&larr; Back to all albums</a>
    <div class="album-header-content">
      <div class="album-header-cover">
        <img src="../<%= album.coverImage %>" alt="<%= escapeHtml(album.name) %>">
      </div>
      <div class="album-header-info">
        <h1><%= album.name %></h1>
        <p class="album-artist"><%= album.artist %></p>
        <p class="album-meta">
          <% if (album.year) { %><%= album.year %> &middot; <% } %>
          <%= album.tracks.length %> track<%= album.tracks.length !== 1 ? 's' : '' %>
          &middot; <%= totalDuration %>
        </p>
      </div>
    </div>
  </header>
  <main>
    <table class="track-list">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-title">Title</th>
          <th class="col-duration">Duration</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        <% album.tracks.forEach(function(track, i) { %>
        <tr data-index="<%= i %>">
          <td class="col-num"><%= track.trackNumber || '' %></td>
          <td class="col-title">
            <span class="track-title"><%= track.title %></span>
            <% if (track.artist !== album.artist) { %>
            <span class="track-artist"><%= track.artist %></span>
            <% } %>
          </td>
          <td class="col-duration"><%= track.duration %></td>
          <td class="col-actions">
            <button class="btn-play" data-src="../<%= track.filePath %>" data-index="<%= i %>" title="Play">&#9654;</button>
            <a class="btn-download" href="../<%= track.filePath %>" download title="Download">&#11015;</a>
          </td>
        </tr>
        <% }); %>
      </tbody>
    </table>
  </main>
  <div id="player">
    <div class="player-track-info">
      <span id="player-title">Select a track</span>
      <span id="player-artist"></span>
    </div>
    <div class="player-controls">
      <button id="btn-prev" title="Previous">&#9198;</button>
      <button id="btn-playpause" title="Play/Pause">&#9654;</button>
      <button id="btn-next" title="Next">&#9197;</button>
    </div>
    <div class="player-seek">
      <span id="time-display">0:00 / 0:00</span>
      <input type="range" id="seek" min="0" max="100" value="0" step="0.1">
    </div>
    <div class="player-volume">
      <label for="volume">&#128264;</label>
      <input type="range" id="volume" min="0" max="1" value="1" step="0.01">
    </div>
    <audio id="audio-el" preload="auto"></audio>
  </div>
  <script>
    window.TRACKS = <%- JSON.stringify(album.tracks.map(function(t) {
      return { title: t.title, artist: t.artist, src: '../' + t.filePath, duration: t.duration };
    })) %>;
  </script>
  <script src="../assets/player.js"></script>
</body>
</html>`;

/**
 * Render the index page HTML.
 */
export function renderIndex(albums, siteTitle) {
  return ejs.render(INDEX_TEMPLATE, { albums, siteTitle, escapeHtml });
}

/**
 * Render an album page HTML.
 */
export function renderAlbum(album, siteTitle) {
  const totalDuration = formatTotalDuration(album.tracks);
  return ejs.render(ALBUM_TEMPLATE, { album, siteTitle, totalDuration, escapeHtml });
}
