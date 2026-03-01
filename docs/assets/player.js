document.addEventListener("DOMContentLoaded", function () {
  var tracks = window.TRACKS || [];
  if (!tracks.length) return;

  var audio = document.getElementById("audio-el");
  var btnPlayPause = document.getElementById("btn-playpause");
  var btnPrev = document.getElementById("btn-prev");
  var btnNext = document.getElementById("btn-next");
  var seekBar = document.getElementById("seek");
  var timeDisplay = document.getElementById("time-display");
  var volumeBar = document.getElementById("volume");
  var playerTitle = document.getElementById("player-title");
  var playerArtist = document.getElementById("player-artist");
  var trackRows = document.querySelectorAll(".track-list tbody tr");
  var playButtons = document.querySelectorAll(".btn-play");

  var currentIndex = -1;
  var isSeeking = false;

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds == null) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function loadTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    currentIndex = index;
    var track = tracks[index];
    audio.src = track.src;
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;

    // Highlight active row
    trackRows.forEach(function (row) {
      row.classList.remove("active");
    });
    if (trackRows[index]) {
      trackRows[index].classList.add("active");
    }
  }

  function playTrack(index) {
    loadTrack(index);
    audio.play().catch(function () {
      // Browser may block autoplay; user interaction required
    });
    updatePlayPauseButton();
  }

  function updatePlayPauseButton() {
    if (audio.paused) {
      btnPlayPause.innerHTML = "&#9654;";
      btnPlayPause.title = "Play";
    } else {
      btnPlayPause.innerHTML = "&#9208;";
      btnPlayPause.title = "Pause";
    }
  }

  // Wire play buttons in track list
  playButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var index = parseInt(this.getAttribute("data-index"), 10);
      playTrack(index);
    });
  });

  // Play/Pause toggle
  btnPlayPause.addEventListener("click", function () {
    if (currentIndex === -1) {
      playTrack(0);
      return;
    }
    if (audio.paused) {
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
    updatePlayPauseButton();
  });

  // Previous track
  btnPrev.addEventListener("click", function () {
    if (currentIndex <= 0) {
      playTrack(tracks.length - 1); // wrap to end
    } else {
      playTrack(currentIndex - 1);
    }
  });

  // Next track
  btnNext.addEventListener("click", function () {
    if (currentIndex >= tracks.length - 1) {
      playTrack(0); // wrap to start
    } else {
      playTrack(currentIndex + 1);
    }
  });

  // Auto-advance on track end
  audio.addEventListener("ended", function () {
    if (currentIndex < tracks.length - 1) {
      playTrack(currentIndex + 1);
    } else {
      // Stop at end of playlist
      updatePlayPauseButton();
    }
  });

  // Time update — sync seek bar and display
  audio.addEventListener("timeupdate", function () {
    if (isSeeking) return;
    if (audio.duration) {
      seekBar.value = (audio.currentTime / audio.duration) * 100;
    }
    timeDisplay.textContent =
      formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
  });

  // Seek bar interaction
  seekBar.addEventListener("mousedown", function () {
    isSeeking = true;
  });
  seekBar.addEventListener("touchstart", function () {
    isSeeking = true;
  });
  seekBar.addEventListener("input", function () {
    if (audio.duration) {
      audio.currentTime = (this.value / 100) * audio.duration;
    }
  });
  seekBar.addEventListener("mouseup", function () {
    isSeeking = false;
  });
  seekBar.addEventListener("touchend", function () {
    isSeeking = false;
  });
  seekBar.addEventListener("change", function () {
    isSeeking = false;
  });

  // Volume control
  volumeBar.addEventListener("input", function () {
    audio.volume = this.value;
  });

  // Update play/pause button on audio events
  audio.addEventListener("play", updatePlayPauseButton);
  audio.addEventListener("pause", updatePlayPauseButton);

  // Double-click a track row to play
  trackRows.forEach(function (row) {
    row.addEventListener("dblclick", function () {
      var index = parseInt(this.getAttribute("data-index"), 10);
      playTrack(index);
    });
  });
});
