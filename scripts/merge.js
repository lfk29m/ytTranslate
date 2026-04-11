#!/usr/bin/env node
/**
 * merge.js - 合併 SRT 片段成完整句子
 *
 * Usage:
 *   node scripts/merge.js <source/input.srt>
 *
 * 輸出：
 *   - 印出編號句子供翻譯
 *   - 儲存合併資料至 target/.work/merged.json
 */

import fs from 'fs'
import path from 'path'
import { parseSrt } from './srt_helper.js'

const SENTENCE_END = /[.!?]\s*$/

export function mergeFragments(blocks) {
  const merged = []
  let buf = [], texts = []

  const flush = () => {
    if (!buf.length) return
    merged.push({ text: texts.filter(Boolean).join(' '), sources: [...buf] })
    buf = []; texts = []
  }

  blocks.forEach((b, i) => {
    const text = b.text.trim()
    buf.push(b); texts.push(text)

    const isLast = i === blocks.length - 1
    let nextGap = false
    if (!isLast) {
      const c = parseInt(b.index), n = parseInt(blocks[i + 1].index)
      if (!isNaN(c) && !isNaN(n)) nextGap = n - c > 1
    }

    if (SENTENCE_END.test(text) || isLast || nextGap) flush()
  })

  return merged
}

// CLI
if (process.argv[1]?.endsWith('merge.js')) {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: node scripts/merge.js <source/input.srt>')
    process.exit(1)
  }

  const blocks = parseSrt(inputPath)
  const merged = mergeFragments(blocks)

  // 儲存至 target/.work/
  fs.mkdirSync('target/.work', { recursive: true })
  fs.writeFileSync('target/.work/merged.json', JSON.stringify(merged, null, 2), 'utf-8')

  console.log(`共 ${merged.length} 句（已儲存至 target/.work/merged.json）\n`)
  merged.forEach((m, i) => {
    const s = m.sources
    console.log(`[${i + 1}] (塊 ${s[0].index}~${s[s.length - 1].index})`)
    console.log(m.text)
    console.log()
  })
}
