import { ref } from 'vue'

/**
 * Parses an SRT subtitle file into an array of cues.
 * Handles UTF-8 BOM, CRLF/LF line endings, and multi-line text.
 *
 * @returns {{ cues: Ref<Array>, srtFilename: Ref<string>, parseSrtFile }}
 *
 * cues element: { id: number, start: number, end: number, text: string }
 * start/end are in seconds (float).
 */
export function useSrtParser() {
  const cues = ref([])
  const srtFilename = ref('')

  /**
   * Parse HH:MM:SS,mmm into seconds.
   * @param {string} ts
   * @returns {number}
   */
  function srtTimeToSeconds(ts) {
    // ts = "00:01:23,456"
    const [hms, ms] = ts.split(',')
    const parts = hms.split(':').map(Number)
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + Number(ms) / 1000
  }

  /**
   * Parse raw SRT text into cues array.
   * @param {string} raw
   * @returns {Array<{id, start, end, text}>}
   */
  function parseSrtText(raw) {
    // Strip UTF-8 BOM if present
    const text = raw.replace(/^\uFEFF/, '')
    // Normalize line endings
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Split into blocks by double blank lines
    const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)

    const result = []
    for (const block of blocks) {
      const lines = block.split('\n')
      if (lines.length < 2) continue

      // First line: sequence number (we keep it for ordering but don't enforce it)
      const id = parseInt(lines[0], 10)
      if (isNaN(id)) continue

      // Second line: timestamp
      const timeLine = lines[1]
      const timeMatch = timeLine.match(
        /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
      )
      if (!timeMatch) continue

      // Normalise dot separator (some tools use '.' instead of ',')
      const startStr = timeMatch[1].replace('.', ',')
      const endStr = timeMatch[2].replace('.', ',')
      const start = srtTimeToSeconds(startStr)
      const end = srtTimeToSeconds(endStr)

      // Remaining lines are subtitle text (may be multi-line)
      const text = lines.slice(2).join('\n').trim()
      if (!text) continue

      result.push({ id, start, end, text })
    }

    // Sort by start time in case the file is out of order
    result.sort((a, b) => a.start - b.start)
    return result
  }

  /**
   * Read and parse an SRT File object.
   * @param {File} file
   * @returns {Promise<void>}
   */
  function parseSrtFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          cues.value = parseSrtText(e.target.result)
          srtFilename.value = file.name
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  return { cues, srtFilename, parseSrtFile }
}
