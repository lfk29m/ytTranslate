#!/usr/bin/env node
/**
 * translate_srt.js — 最終翻譯方案
 *
 * 流程：
 *   1. 合併 SRT 片段成完整句子
 *   2. 每批顯示英文句子，貼入翻譯（[N] 格式）
 *   3. 中文按標點切成 ~22 字小塊
 *   4. 用英文字元比例對應回原始時間戳
 *   5. 輸出新的 .srt
 *
 * Usage:
 *   node scripts/translate_srt.js <input.srt> [output.srt]
 */

import fs from 'fs'
import readline from 'readline'
import { parseSrt, writeSrt } from './srt_helper.js'

const MAX_ZH_CHARS = 22
const HARD_MAX     = MAX_ZH_CHARS + 10
const BATCH_SIZE   = 50
const SENTENCE_END = /[.!?]\s*$/
const PUNCT        = new Set([...`。，！？；、：—`])

// ── 時間戳工具 ────────────────────────────────────────────────────────────────

function tsToMs(ts) {
  const [h, m, rest] = ts.split(':')
  const [s, ms] = rest.split(',')
  return (+h) * 3600000 + (+m) * 60000 + (+s) * 1000 + (+ms)
}

function msToTs(ms) {
  const h  = Math.floor(ms / 3600000); ms %= 3600000
  const m  = Math.floor(ms / 60000);   ms %= 60000
  const s  = Math.floor(ms / 1000);    ms %= 1000
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`
}

// ── 合併片段成句 ──────────────────────────────────────────────────────────────

function mergeFragments(blocks) {
  const merged = []
  let bufBlocks = [], bufTexts = []

  const flush = () => {
    if (!bufBlocks.length) return
    merged.push({ text: bufTexts.filter(Boolean).join(' '), sources: [...bufBlocks] })
    bufBlocks = []; bufTexts = []
  }

  blocks.forEach((b, i) => {
    const text = b.text.trim()
    bufBlocks.push(b); bufTexts.push(text)

    const isLast = i === blocks.length - 1
    let nextGap = false
    if (!isLast) {
      const curr = parseInt(b.index), next = parseInt(blocks[i + 1].index)
      if (!isNaN(curr) && !isNaN(next)) nextGap = next - curr > 1
    }

    if (SENTENCE_END.test(text) || isLast || nextGap) flush()
  })

  return merged
}

// ── 中文按標點切塊 ────────────────────────────────────────────────────────────

function splitZhByPunct(text) {
  const chunks = []
  let buf = ''

  for (const ch of text) {
    buf += ch

    if (buf.length >= MAX_ZH_CHARS && PUNCT.has(ch)) {
      chunks.push(buf.trim())
      buf = ''
    } else if (buf.length >= HARD_MAX) {
      // 往回找最近的標點
      let lastPunct = -1
      for (let i = buf.length - 1; i >= MAX_ZH_CHARS / 2; i--) {
        if (PUNCT.has(buf[i])) { lastPunct = i; break }
      }
      if (lastPunct > 0) {
        chunks.push(buf.slice(0, lastPunct + 1).trim())
        buf = buf.slice(lastPunct + 1)
      } else {
        chunks.push(buf.trim())
        buf = ''
      }
    }
  }

  if (buf.trim()) chunks.push(buf.trim())
  return chunks.length ? chunks : [text]
}

// ── 英文字元位置 → 毫秒 ───────────────────────────────────────────────────────

function enPosToMs(enCharPos, sources) {
  let cumulative = 0
  for (const src of sources) {
    const srcLen = src.text.length
    if (cumulative + srcLen >= enCharPos || src === sources[sources.length - 1]) {
      const localPos   = enCharPos - cumulative
      const [startTs, endTs] = src.timestamp.split(' --> ')
      const blockStart = tsToMs(startTs)
      const blockEnd   = tsToMs(endTs)
      const ratio      = localPos / Math.max(srcLen, 1)
      return Math.round(blockStart + ratio * (blockEnd - blockStart))
    }
    cumulative += srcLen
  }
  return tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1])
}

// ── 套用翻譯，產生輸出塊 ──────────────────────────────────────────────────────

function applyTranslation(unit, zhText, counter) {
  const { sources } = unit
  const enTotal    = sources.reduce((s, b) => s + b.text.length, 0)
  const zhTotal    = zhText.length
  const chunks     = splitZhByPunct(zhText)
  const groupEndMs = tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1])

  const outBlocks = []
  let zhCum = 0

  chunks.forEach((chunk, i) => {
    const zhStart = zhCum
    const zhEnd   = zhCum + chunk.length
    zhCum = zhEnd

    const cs = enPosToMs((zhStart / zhTotal) * enTotal, sources)
    const ce = i < chunks.length - 1
      ? enPosToMs((zhEnd / zhTotal) * enTotal, sources)
      : groupEndMs

    outBlocks.push({
      index:     String(counter + i),
      timestamp: `${msToTs(cs)} --> ${msToTs(Math.max(ce, cs + 500))}`,
      text:      chunk,
    })
  })

  return outBlocks
}

// ── 互動翻譯主流程 ────────────────────────────────────────────────────────────

async function translateInteractively(merged) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = () => new Promise(resolve => {
    const lines = []
    rl.on('line', line => {
      if (line.trim() === '') { rl.removeAllListeners('line'); resolve(lines) }
      else lines.push(line)
    })
  })

  const totalBatches = Math.ceil(merged.length / BATCH_SIZE)
  const outBlocks = []
  let counter = 1

  console.log(`\n共 ${merged.length} 個合併句，分 ${totalBatches} 批翻譯。`)
  console.log('每批顯示英文句子，請翻譯後以 [N] 格式貼回（空白行送出）。\n')

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE
    const end   = Math.min(start + BATCH_SIZE, merged.length)
    const batch = merged.slice(start, end)

    console.log('='.repeat(70))
    console.log(`批次 ${batchIdx + 1}/${totalBatches}  (句 ${start + 1}–${end})`)
    console.log('='.repeat(70))
    batch.forEach((m, i) => console.log(`[${i + 1}] ${m.text}`))
    console.log('\n── 貼上翻譯（空白行送出，SKIP 跳過）：')

    const lines = await ask()

    if (!lines.length || lines[0].trim().toUpperCase() === 'SKIP') {
      batch.forEach(unit => {
        const blocks = applyTranslation(unit, unit.text, counter)
        outBlocks.push(...blocks)
        counter += blocks.length
      })
      console.log('  跳過，保留原文。')
      continue
    }

    const translations = {}
    for (const line of lines) {
      const m = line.match(/^\[(\d+)\]\s*(.*)/)
      if (m) translations[+m[1]] = m[2].trim()
    }

    batch.forEach((unit, i) => {
      const zhText = translations[i + 1] ?? unit.text
      if (!translations[i + 1]) console.log(`  ⚠ 第 ${i + 1} 句未找到翻譯，保留原文`)
      const blocks = applyTranslation(unit, zhText, counter)
      outBlocks.push(...blocks)
      counter += blocks.length
    })

    console.log(`  ✓ 批次 ${batchIdx + 1} 已套用`)
  }

  rl.close()
  return outBlocks
}

// ── Entry point ───────────────────────────────────────────────────────────────

import path from 'path'

const [,, inputPath, outputPath] = process.argv
if (!inputPath) {
  console.log('Usage: node scripts/translate_srt.js <source/file.srt> [target/file.srt]')
  console.log('  預設從 source/ 讀取，翻譯結果輸出至 target/')
  process.exit(1)
}

const filename = path.basename(inputPath, '.srt')
const outPath  = outputPath ?? `target/${filename}_zh.srt`
const blocks  = parseSrt(inputPath)
const merged  = mergeFragments(blocks)
const out     = await translateInteractively(merged)
writeSrt(out, outPath)
console.log(`\n✓ 完成 → ${outPath}  (${out.length} 塊)`)
