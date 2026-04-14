<script setup>
import { ref } from "vue";

const props = defineProps({
  filename: {
    type: String,
    default: "",
  },
  cueCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["import"]);

const fileInput = ref(null);
const errorMsg = ref("");

function openPicker() {
  errorMsg.value = "";
  fileInput.value?.click();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (
    !file.name.toLowerCase().endsWith(".srt") &&
    !file.name.toLowerCase().endsWith(".txt")
  ) {
    errorMsg.value = "請選擇 .srt 或 .txt 格式的字幕檔案";
    // Reset so the same file can be re-selected after correction
    event.target.value = "";
    return;
  }

  errorMsg.value = "";
  emit("import", file);
  // Reset input so user can re-import the same file
  event.target.value = "";
}
</script>

<template>
  <div class="srt-importer">
    <!-- Hidden native file picker -->
    <input
      ref="fileInput"
      type="file"
      accept=".srt,.txt"
      class="hidden-input"
      @change="handleFileChange"
    />

    <div class="importer-row">
      <button class="import-btn" @click="openPicker">
        <svg class="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2v10m0 0-3-3m3 3 3-3M4 14v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        匯入字幕 (.srt / .txt)
      </button>

      <span v-if="filename" class="file-info">
        {{ filename }}
        <span class="cue-count">（{{ cueCount }} 條）</span>
      </span>
    </div>

    <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.hidden-input {
  display: none;
}

.importer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  transition:
    border-color 0.2s,
    background 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.import-btn:active {
  background: var(--color-border);
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-info {
  font-size: 13px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.cue-count {
  color: #6dbf6d;
}

.error-text {
  font-size: 13px;
  color: #ff8080;
  margin-top: 4px;
}
</style>
