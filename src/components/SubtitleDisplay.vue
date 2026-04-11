<script setup>
defineProps({
  cue: {
    type: Object, // { text: string } | null
    default: null,
  },
});
</script>

<template>
  <Transition name="subtitle-fade">
    <div v-if="cue" class="subtitle-display" aria-live="polite">
      <!-- Support multi-line text by splitting on \n -->
      <span
        v-for="(line, i) in cue.text.split('\n')"
        :key="i"
        class="subtitle-line"
        >{{ line }}</span
      >
    </div>
  </Transition>
</template>

<style scoped>
.subtitle-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: var(--radius);
  /* pointer-events: none lets taps pass through to the video on iOS */
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.subtitle-line {
  display: block;
  font-size: clamp(15px, 4vw, 20px);
  font-weight: 500;
  line-height: 1.45;
  color: #fff;
  text-align: center;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.01em;
}

/* Fade transition */
.subtitle-fade-enter-active,
.subtitle-fade-leave-active {
  transition: opacity 0.15s ease;
}

.subtitle-fade-enter-from,
.subtitle-fade-leave-to {
  opacity: 0;
}
</style>
