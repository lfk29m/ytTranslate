/**
 * Thin localStorage wrapper for persisting video ID and SRT content.
 * All operations are wrapped in try/catch to guard against:
 *  - Private browsing mode where localStorage is blocked
 *  - QuotaExceededError when storage is full (SRT files are usually small)
 */

const KEY_VIDEO_ID = 'yt-translate:videoId'
const KEY_SRT_TEXT = 'yt-translate:srtText'
const KEY_SRT_NAME = 'yt-translate:srtFilename'

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

  return { saveVideoId, loadVideoId, saveSrt, loadSrt }
}
