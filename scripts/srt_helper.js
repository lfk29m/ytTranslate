#!/usr/bin/env node
/**
 * srt_helper.js - Parse and reassemble SRT files
 *
 * Usage:
 *   node scripts/srt_helper.js extract   <input.srt>  <output.json>
 *   node scripts/srt_helper.js reassemble <input.json> <output.srt>
 */

import fs from 'fs'

export function parseSrt(path) {
  const content = fs.readFileSync(path, 'utf-8').replace(/^\uFEFF/, '')
  return content
    .trim()
    .split(/\n\n+/)
    .flatMap(raw => {
      const lines = raw.trim().split('\n')
      if (lines.length < 2) return []
      return [{
        index:     lines[0].trim(),
        timestamp: lines[1].trim(),
        text:      lines.slice(2).join('\n'),
      }]
    })
}

export function writeSrt(blocks, path) {
  const content = blocks
    .map(b => [b.index, b.timestamp, b.text, ''].join('\n'))
    .join('\n')
  fs.writeFileSync(path, content, 'utf-8')
}

// CLI
if (process.argv[1]?.endsWith('srt_helper.js')) {
  const [,, cmd, input, output] = process.argv

  if (cmd === 'extract') {
    const blocks = parseSrt(input)
    fs.writeFileSync(output, JSON.stringify(blocks, null, 2), 'utf-8')
    console.log(`Extracted ${blocks.length} blocks → ${output}`)

  } else if (cmd === 'reassemble') {
    const blocks = JSON.parse(fs.readFileSync(input, 'utf-8'))
    writeSrt(blocks, output)
    console.log(`Wrote ${blocks.length} blocks → ${output}`)

  } else {
    console.log('Usage:')
    console.log('  node scripts/srt_helper.js extract    <input.srt>  <output.json>')
    console.log('  node scripts/srt_helper.js reassemble <input.json> <output.srt>')
  }
}
