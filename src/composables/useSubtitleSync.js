// YouTube IFrame API player state constants
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
}

const POLL_INTERVAL_MS = 250

/**
 * Polls player.getCurrentTime() every 250ms while playing and writes the
 * active SRT cue into the caller-supplied `currentCue` ref.
 *
 * Accepting the ref from outside avoids the double-ref problem that arises
 * when this composable is initialised from a regular event handler (not setup()).
 *
 * @param {{ onPlayerStateChange: Function, getCurrentTime: Function }} playerAPI
 * @param {Ref<Array<{start, end, text}>>} cues
 * @param {Ref<object|null>} currentCue  – caller-owned ref to write into
 * @returns {{ dispose: Function }}
 */
export function useSubtitleSync(playerAPI, cues, currentCue) {
  let intervalId = null

  function findCue(timeSeconds) {
    const arr = cues.value
    if (!arr.length) return null
    // Binary search for efficiency
    let lo = 0
    let hi = arr.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const cue = arr[mid]
      if (timeSeconds < cue.start) {
        hi = mid - 1
      } else if (timeSeconds > cue.end) {
        lo = mid + 1
      } else {
        return cue
      }
    }
    return null
  }

  function startPolling() {
    stopPolling()
    intervalId = setInterval(() => {
      const t = playerAPI.getCurrentTime()
      currentCue.value = findCue(t)
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function clearSubtitle() {
    currentCue.value = null
  }

  // Register for player state changes
  playerAPI.onPlayerStateChange((state) => {
    switch (state) {
      case YT_STATE.PLAYING:
        startPolling()
        break
      case YT_STATE.PAUSED:
        stopPolling()
        // Show the cue at the paused position
        currentCue.value = findCue(playerAPI.getCurrentTime())
        break
      case YT_STATE.ENDED:
      case YT_STATE.UNSTARTED:
        stopPolling()
        clearSubtitle()
        break
      case YT_STATE.BUFFERING:
        // Keep polling during buffering so we don't lose sync on resume
        break
      default:
        stopPolling()
        clearSubtitle()
    }
  })

  // When a new SRT is loaded mid-playback the polling interval will
  // naturally pick up the correct cue on its next 250ms tick, so no
  // explicit watch(cues, ...) is needed — and calling watch() outside
  // of a component's setup() can cause Vue warnings / untracked effects.

  function dispose() {
    stopPolling()
    currentCue.value = null
  }

  return { dispose }
}
