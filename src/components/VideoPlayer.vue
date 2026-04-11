<script setup>
import { ref, watch } from "vue";
import { useYouTubePlayer } from "../composables/useYouTubePlayer.js";

const props = defineProps({
  videoId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["playerReady", "stateChange", "playerApi"]);

const playerContainer = ref(null);
const { playerReady, loadVideo, getCurrentTime, onPlayerStateChange } =
  useYouTubePlayer(playerContainer);

// Bubble state changes to parent
onPlayerStateChange((state) => emit("stateChange", state));

// Once player is ready, expose API to parent
watch(playerReady, (ready) => {
  if (ready) {
    emit("playerReady");
    emit("playerApi", { getCurrentTime, loadVideo, onPlayerStateChange });
  }
});

// When videoId prop changes, load the new video
watch(
  () => props.videoId,
  (id) => {
    if (id) loadVideo(id);
  },
);
</script>

<template>
  <!-- 16:9 aspect-ratio wrapper keeps the iframe proportional on all screen sizes -->
  <div class="player-wrapper">
    <div class="player-aspect">
      <!-- YT.Player replaces this div with the actual <iframe> -->
      <div ref="playerContainer" class="player-target" />
      <div v-if="!playerReady" class="player-placeholder">
        <span>播放器載入中…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-wrapper {
  width: 100%;
  background: #000;
}

.player-aspect {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #000;
}

.player-target,
.player-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* YT.Player inserts an iframe as a sibling or replaces the div;
   make sure the iframe fills the container */
.player-aspect :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.player-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 14px;
  pointer-events: none;
}
</style>
