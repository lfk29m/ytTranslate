<script setup>
import { ref, shallowRef } from "vue";
import UrlInput from "./components/UrlInput.vue";
import VideoPlayer from "./components/VideoPlayer.vue";
import SrtImporter from "./components/SrtImporter.vue";
import SubtitleDisplay from "./components/SubtitleDisplay.vue";
import { useSrtParser } from "./composables/useSrtParser.js";
import { useSubtitleSync } from "./composables/useSubtitleSync.js";

// ── State ──────────────────────────────────────────────────────────────────
const videoId = ref("");
const playerApiRef = shallowRef(null); // { getCurrentTime, loadVideo, onPlayerStateChange }
const currentCueRef = ref(null);

const { cues, srtFilename, parseSrtFile } = useSrtParser();

let syncDispose = null;

// ── Handlers ───────────────────────────────────────────────────────────────

/** Called by UrlInput when a valid video ID is parsed */
function onLoadVideo(id) {
  videoId.value = id;
}

/**
 * Called by VideoPlayer once the YT.Player is ready.
 * Sets up subtitle sync using the player API.
 */
function onPlayerApi(api) {
  playerApiRef.value = api;

  // Dispose previous sync if user loaded a new video
  if (syncDispose) syncDispose();

  const { currentCue, dispose } = useSubtitleSync(api, cues);
  currentCueRef.value = currentCue; // currentCue is a reactive ref itself
  syncDispose = dispose;
}

/** Called by SrtImporter when a file is selected */
async function onImportSrt(file) {
  try {
    await parseSrtFile(file);
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
      <VideoPlayer :video-id="videoId" @player-api="onPlayerApi" />
      <!-- Subtitle display sits below the video on mobile -->
      <div class="subtitle-area">
        <SubtitleDisplay :cue="currentCueRef?.value ?? null" />
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

.subtitle-area {
  display: flex;
  justify-content: center;
  padding: 8px 16px;
  min-height: 52px;
  background: #000;
}

.importer-section {
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.safe-area-bottom {
  height: var(--safe-bottom);
  flex-shrink: 0;
}
</style>
