<script setup>
import { ref } from "vue";

const emit = defineEmits(["load"]);

const input = ref("");
const errorMsg = ref("");

/**
 * Extract an 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Raw 11-char ID
 */
function extractVideoId(raw) {
  const trimmed = raw.trim();

  // Raw 11-char alphanumeric ID (YouTube IDs use [A-Za-z0-9_-])
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      // /watch?v=
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

      // /embed/ID or /shorts/ID or /v/ID
      const pathMatch = url.pathname.match(
        /\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/,
      );
      if (pathMatch) return pathMatch[1];
    }
  } catch {
    // Not a valid URL — fall through
  }

  return null;
}

function handleSubmit() {
  errorMsg.value = "";
  const videoId = extractVideoId(input.value);
  if (!videoId) {
    errorMsg.value = "無法識別 YouTube 網址，請貼上完整連結或影片 ID";
    return;
  }
  emit("load", videoId);
}
</script>

<template>
  <div class="url-input">
    <div class="input-row">
      <input
        v-model="input"
        type="text"
        inputmode="url"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="貼上 YouTube 網址或影片 ID…"
        class="url-field"
        @keydown.enter="handleSubmit"
      />
      <button class="load-btn" @click="handleSubmit">載入</button>
    </div>
    <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.url-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.url-field {
  flex: 1;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 15px;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s;
  min-width: 0;
}

.url-field:focus {
  border-color: var(--color-accent);
}

.load-btn {
  background: var(--color-accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius);
  padding: 10px 18px;
  white-space: nowrap;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.load-btn:active {
  opacity: 0.75;
}

.error-text {
  font-size: 13px;
  color: #ff8080;
  padding-left: 2px;
}
</style>
