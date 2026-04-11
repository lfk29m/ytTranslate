/**
 * Thin localStorage wrapper for persisting video ID and SRT content.
 * All operations are wrapped in try/catch to guard against:
 *  - Private browsing mode where localStorage is blocked
 *  - QuotaExceededError when storage is full (SRT files are usually small)
 */

const KEY_VIDEO_ID = 'yt-translate:videoId'
const KEY_SRT_TEXT = 'yt-translate:srtText'
const KEY_SRT_NAME = 'yt-translate:srtFilename'
const KEY_POS_ID = 'yt-translate:pos:id'
const KEY_POS_SEC = 'yt-translate:pos:sec'
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

  // ── SRT ───────────────────────────────────────────────────────────────
  /**
   * @param {string} filename
   * @param {string} rawText  — full SRT file content as a string
   */
  function saveSrt(filename, rawText) {
    if (filename && rawText) {
      set(KEY_SRT_NAME, filename)
      set(KEY_SRT_TEXT, rawText)
    } else {
      remove(KEY_SRT_NAME)
      remove(KEY_SRT_TEXT)
    }
  }

  /**
   * @returns {{ filename: string, rawText: string } | null}
   */
  function loadSrt() {
    const filename = get(KEY_SRT_NAME)
    const rawText = get(KEY_SRT_TEXT)
    if (filename && rawText) return { filename, rawText }
    return null
  }

  // ── Playback position ─────────────────────────────────────────────────
  /**
   * Save the current playback position for a specific video.
   * Only one (videoId, seconds) pair is kept at a time.
   * @param {string} videoId
   * @param {number} seconds
   */
  function savePosition(videoId, seconds) {
    if (!videoId || seconds == null) return
    set(KEY_POS_ID, videoId)
    set(KEY_POS_SEC, String(seconds))
  }

  /**
   * Return saved position (seconds) for a given videoId, or 0 if none.
   * @param {string} videoId
   * @returns {number}
   */
  function loadPosition(videoId) {
    if (!videoId) return 0
    const savedId = get(KEY_POS_ID)
    if (savedId !== videoId) return 0
    return parseFloat(get(KEY_POS_SEC) ?? '0') || 0
  }

  return { saveVideoId, loadVideoId, saveSrt, loadSrt, savePosition, loadPosition }
}
