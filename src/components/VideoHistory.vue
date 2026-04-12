<script setup>
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['load', 'remove', 'clear'])

function thumbUrl(id) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}
</script>

<template>
  <div v-if="entries.length" class="history-wrap">
    <div class="history-header">
      <span class="history-title">最近觀看</span>
      <button class="clear-btn" @click="emit('clear')">清除全部</button>
    </div>

    <div class="history-scroll">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="history-card"
        @click="emit('load', entry.id)"
      >
        <div class="thumb-wrap">
          <img
            :src="thumbUrl(entry.id)"
            :alt="entry.id"
            class="thumb"
            loading="lazy"
            decoding="async"
          />
          <button
            class="remove-btn"
            @click.stop="emit('remove', entry.id)"
            aria-label="從歷史移除"
          >×</button>
        </div>
        <span class="video-id">{{ entry.title || entry.id }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-wrap {
  padding: 12px 0 4px;
  border-top: 1px solid var(--color-border);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-btn {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.clear-btn:active {
  color: var(--color-text);
}

.history-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 0 16px 12px;
  scrollbar-width: none; /* Firefox */
}

.history-scroll::-webkit-scrollbar {
  display: none;
}

.history-card {
  flex-shrink: 0;
  width: 130px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 5px;
  -webkit-tap-highlight-color: transparent;
}

.thumb-wrap {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-surface);
  aspect-ratio: 16 / 9;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.15s;
}

.history-card:active .thumb {
  opacity: 0.7;
}

.remove-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

/* Always visible on touch devices */
@media (hover: none) {
  .remove-btn {
    opacity: 1;
  }
}

.thumb-wrap:hover .remove-btn {
  opacity: 1;
}

.remove-btn:active {
  background: rgba(200, 0, 0, 0.8);
}

.video-id {
  font-size: 11px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
