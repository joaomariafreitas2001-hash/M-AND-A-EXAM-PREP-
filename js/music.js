/* Background music — YouTube embed */
const YT_VIDEO_ID = 'K4moMXMCN4w';
const LS_MUSIC_VOL = 'madeals_music_vol_v1';

let ytPlayer = null;
let ytReady = false;
let musicPlaying = false;

function getSavedVolume() {
  const v = parseInt(localStorage.getItem(LS_MUSIC_VOL) || '40', 10);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 40;
}

function saveVolume(v) {
  localStorage.setItem(LS_MUSIC_VOL, String(v));
}

function updateMusicUI() {
  const btn = document.getElementById('musicToggle');
  const vol = document.getElementById('musicVolume');
  if (!btn) return;
  btn.textContent = musicPlaying ? 'Pause music' : 'Play music';
  btn.setAttribute('aria-pressed', musicPlaying ? 'true' : 'false');
  btn.classList.toggle('playing', musicPlaying);
  if (vol && vol.value !== String(getSavedVolume())) vol.value = getSavedVolume();
}

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    height: '200',
    width: '200',
    videoId: YT_VIDEO_ID,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      loop: 1,
      playlist: YT_VIDEO_ID,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: (e) => {
        ytReady = true;
        e.target.setVolume(getSavedVolume());
        updateMusicUI();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) musicPlaying = true;
        if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) musicPlaying = false;
        updateMusicUI();
      },
    },
  });
}

function toggleMusic() {
  if (!ytReady || !ytPlayer) {
    alert('Music player still loading — wait a moment and try again, or open the track on YouTube.');
    return;
  }
  if (musicPlaying) {
    ytPlayer.pauseVideo();
    musicPlaying = false;
  } else {
    ytPlayer.playVideo();
    musicPlaying = true;
  }
  updateMusicUI();
}

function bindMusicControls() {
  const btn = document.getElementById('musicToggle');
  const vol = document.getElementById('musicVolume');
  if (btn) btn.onclick = toggleMusic;
  if (vol) {
    vol.value = getSavedVolume();
    vol.oninput = () => {
      const v = parseInt(vol.value, 10);
      saveVolume(v);
      if (ytReady && ytPlayer?.setVolume) ytPlayer.setVolume(v);
    };
  }
  updateMusicUI();
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

document.addEventListener('DOMContentLoaded', bindMusicControls);

if (window.YT && window.YT.Player) {
  onYouTubeIframeAPIReady();
}
