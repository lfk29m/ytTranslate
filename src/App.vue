<script setup>
import { ref, shallowRef, onMounted } from "vue";
import UrlInput from "./components/UrlInput.vue";
import VideoPlayer from "./components/VideoPlayer.vue";
import SrtImporter from "./components/SrtImporter.vue";
import SubtitleDisplay from "./components/SubtitleDisplay.vue";
import { useSrtParser } from "./composables/useSrtParser.js";
import { useSubtitleSync } from "./composables/useSubtitleSync.js";
import { useAppCache } from "./composables/useAppCache.js";

// ── State ──────────────────────────────────────────────────────────────────
const videoId = ref("");
const playerApiRef = shallowRef(null); // { getCurrentTime, loadVideo, onPlayerStateChange }
// Single source of truth for the currently active subtitle cue.
// Lives here so the template can directly track this plain ref.
const currentCue = ref(null);

const { cues, srtFilename, parseSrtFile, parseSrtRaw } = useSrtParser();
const {
  saveVideoId,
  loadVideoId,
  saveSrt,
  loadSrt,
  savePosition,
  loadPosition,
} = useAppCache();

let syncDispose = null;
// Seconds to seek to on the next PLAYING event (0 = no pending seek)
let pendingSeekSeconds = 0;
// Interval ID for periodic position saves during playback
let positionSaveIntervalId = null;

// ── Restore cache on first load ────────────────────────────────────────────
onMounted(() => {
  const cachedId = loadVideoId();
  if (cachedId) {
    videoId.value = cachedId;
    // Pre-load the saved position so it's ready when the player fires
    pendingSeekSeconds = loadPosition(cachedId);
  }

  const cachedSrt = loadSrt();
  if (cachedSrt) parseSrtRaw(cachedSrt.rawText, cachedSrt.filename);
});

// ── Handlers ───────────────────────────────────────────────────────────────

/** Called by UrlInput when a valid video ID is parsed */
function onLoadVideo(id) {
  videoId.value = id;
  saveVideoId(id);
  // Update pending seek for the newly selected video
  pendingSeekSeconds = loadPosition(id);
}

/**
 * Called by VideoPlayer once the YT.Player is ready.
 * Sets up subtitle sync using the player API.
 */
function onPlayerApi(api) {
  playerApiRef.value = api;

  if (syncDispose) syncDispose();
  const { dispose } = useSubtitleSync(api, cues, currentCue);
  syncDispose = dispose;

  // ── Position save / restore ────────────────────────────────
  api.onPlayerStateChange((state) => {
    if (state === 1 /* PLAYING */) {
      // Seek to saved position on first play after a video loads
      if (pendingSeekSeconds > 5) {
        api.seekTo(pendingSeekSeconds);
        pendingSeekSeconds = 0;
      }
      // Save position every 5 s during playback
      if (!positionSaveIntervalId) {
        positionSaveIntervalId = setInterval(() => {
          const t = api.getCurrentTime();
          if (t > 0) savePosition(videoId.value, t);
        }, 5000);
      }
    } else if (state === 2 /* PAUSED */) {
      clearInterval(positionSaveIntervalId);
      positionSaveIntervalId = null;
      const t = api.getCurrentTime();
      if (t > 0) savePosition(videoId.value, t);
    } else if (state === 0 /* ENDED */) {
      clearInterval(positionSaveIntervalId);
      positionSaveIntervalId = null;
      savePosition(videoId.value, 0); // reset so next open starts from beginning
    } else {
      clearInterval(positionSaveIntervalId);
      positionSaveIntervalId = null;
    }
  });
}

/** Called by SrtImporter when a file is selected */
async function onImportSrt(file) {
  try {
    // Read raw text first so we can both parse and cache it
    const rawText = await file.text();
    parseSrtRaw(rawText, file.name);
    saveSrt(file.name, rawText);
  } catch (err) {
    console.error("[App] SRT parse error:", err);
  }
}
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <h1 class="app-title">YT 字幕播放器</h1>
    </header>

    <!-- URL input -->
    <section class="section url-section">
      <UrlInput @load="onLoadVideo" />
    </section>

    <!-- Video player + subtitle display -->
    <section class="player-section">
      <div class="video-with-subtitles">
        <VideoPlayer :video-id="videoId" @player-api="onPlayerApi" />
        <div class="subtitle-overlay">
          <SubtitleDisplay :cue="currentCue" />
        </div>
      </div>
    </section>

    <!-- SRT importer -->
    <section class="section importer-section">
      <SrtImporter
        :filename="srtFilename"
        :cue-count="cues.length"
        @import="onImportSrt"
      />
    </section>

    <!-- Footer safe area spacer for iOS home indicator -->
    <div class="safe-area-bottom" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.app-header {
  padding: 14px 16px 10px;
  padding-top: calc(14px + var(--safe-top));
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.app-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--color-text);
}

.section {
  padding: 14px 16px;
}

.url-section {
  border-bottom: 1px solid var(--color-border);
}

/* Player fills full width; no horizontal padding so video is edge-to-edge */
.player-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
}

.video-with-subtitles {
  position: relative;
  width: 100%;
}

.subtitle-overlay {
  position: absolute;
  bottom: 80px; /* clear YouTube's control bar */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
  z-index: 10;
}

.importer-section {
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.safe-area-bottom {
  height: var(--safe-bottom);
  flex-shrink: 0;
}

/* ── 手機橫向：影片撐滿全螢幕高度 ──────────────────────────────── */
@media (orientation: landscape) and (max-height: 600px) {
  .video-with-subtitles {
    height: 100dvh;
  }

  /* 覆蓋 VideoPlayer 內的 padding-top 16:9 技巧 */
  .video-with-subtitles :deep(.player-aspect) {
    padding-top: 0;
    height: 100dvh;
  }
}
</style>
