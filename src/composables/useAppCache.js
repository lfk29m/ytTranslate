/**
 * Thin localStorage wrapper for persisting video ID and SRT content.
 * All operations are wrapped in try/catch to guard against:
 *  - Private browsing mode where localStorage is blocked
 *  - QuotaExceededError when storage is full (SRT files are usually small)
 *
 * SRT and playback-position keys are scoped to the video ID so that
 * switching between videos never overwrites another video's cached data.
 */

const KEY_VIDEO_ID = 'yt-translate:videoId'

/** Build a video-scoped localStorage key. */
function videoKey(videoId, suffix) {
  return `yt-translate:${videoId}:${suffix}`
}

function get(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function set(key, value) {
  try { localStorage.setItem(key, value) } catch { /* quota or private mode */ }
}

function remove(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

export function useAppCache() {
  // ── Video ID ──────────────────────────────────────────────────────────
  function saveVideoId(id) {
    if (id) set(KEY_VIDEO_ID, id)
    else remove(KEY_VIDEO_ID)
  }

  function loadVideoId() {
    return get(KEY_VIDEO_ID) ?? ''
  }

  // ── SRT (scoped per video) ────────────────────────────────────────────
  /**
   * @param {string} videoId
   * @param {string} filename
   * @param {string} rawText  — full SRT file content as a string
   */
  function saveSrt(videoId, filename, rawText) {
    if (!videoId) return
    if (filename && rawText) {
      set(videoKey(videoId, 'srtFilename'), filename)
      set(videoKey(videoId, 'srtText'), rawText)
    } else {
      remove(videoKey(videoId, 'srtFilename'))
      remove(videoKey(videoId, 'srtText'))
    }
  }

  /**
   * @param {string} videoId
   * @returns {{ filename: string, rawText: string } | null}
   */
  function loadSrt(videoId) {
    if (!videoId) return null
    const filename = get(videoKey(videoId, 'srtFilename'))
    const rawText = get(videoKey(videoId, 'srtText'))
    if (filename && rawText) return { filename, rawText }
    return null
  }

  // ── Playback position (scoped per video) ──────────────────────────────
  /**
   * @param {string} videoId
   * @param {number} seconds
   */
  function savePosition(videoId, seconds) {
    if (!videoId || seconds == null) return
    set(videoKey(videoId, 'pos'), String(seconds))
  }

  /**
   * @param {string} videoId
   * @returns {number}
   */
  function loadPosition(videoId) {
    if (!videoId) return 0
    return parseFloat(get(videoKey(videoId, 'pos')) ?? '0') || 0
  }

  return { saveVideoId, loadVideoId, saveSrt, loadSrt, savePosition, loadPosition }
}
