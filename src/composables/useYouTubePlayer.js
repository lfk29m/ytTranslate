import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Manages the YouTube IFrame Player API lifecycle.
 * Compatible with iOS Safari (playsinline + enablejsapi).
 *
 * @param {Ref<HTMLElement|null>} containerRef - ref to the div that YT.Player will replace
 * @returns {{ playerReady, loadVideo, onPlayerStateChange }}
 */
export function useYouTubePlayer(containerRef) {
  const playerReady = ref(false)
  let player = null
  const stateChangeCallbacks = []

  function onPlayerStateChange(cb) {
    stateChangeCallbacks.push(cb)
  }

  function loadVideo(videoId) {
    if (!playerReady.value || !player) return
    player.loadVideoById(videoId)
  }

  function createPlayer() {
    if (!containerRef.value) return
    player = new window.YT.Player(containerRef.value, {
      playerVars: {
        playsinline: 1,   // CRITICAL for iOS Safari inline playback
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin || '*',
      },
      events: {
        onReady() {
          playerReady.value = true
        },
        onStateChange(event) {
          stateChangeCallbacks.forEach(cb => cb(event.data))
        },
        onError(event) {
          console.warn('[YTPlayer] error code:', event.data)
        },
      },
    })
  }

  function getCurrentTime() {
    if (!player || !playerReady.value) return 0
    try {
      return player.getCurrentTime() || 0
    } catch {
      return 0
    }
  }

  onMounted(() => {
    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      // Chain the global callback safely so we don't clobber other handlers
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        createPlayer()
      }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }
  })

  onUnmounted(() => {
    stateChangeCallbacks.length = 0
    if (player) {
      try { player.destroy() } catch { /* ignore */ }
      player = null
    }
    playerReady.value = false
  })

  return {
    playerReady,
    loadVideo,
    getCurrentTime,
    onPlayerStateChange,
  }
}
