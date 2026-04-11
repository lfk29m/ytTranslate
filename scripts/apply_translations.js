#!/usr/bin/env node
/**
 * apply_translations.js - 套用翻譯並輸出 .srt
 *
 * Usage:
 *   node scripts/apply_translations.js <source/input.srt> <translations.json>
 *
 * translations.json 格式：["第一句翻譯", "第二句翻譯", ...]
 *
 * 讀取：target/.work/merged.json（由 merge.js 產生）
 * 輸出：target/<name>_zh.srt
 */

import fs from 'fs'
import path from 'path'
import { writeSrt } from './srt_helper.js'

const MAX_ZH  = 22
const HARD_MAX = 32
const PUNCT   = new Set([...'。，！？；、：—'])

// ── 時間戳工具 ────────────────────────────────────────────────────────────────

function tsToMs(ts) {
  const [h, m, r] = ts.split(':')
  const [s, ms]   = r.split(',')
  return +h * 3600000 + +m * 60000 + +s * 1000 + +ms
}

function msToTs(ms) {
  const h = Math.floor(ms / 3600000); ms %= 3600000
  const m = Math.floor(ms / 60000);   ms %= 60000
  const s = Math.floor(ms / 1000);    ms %= 1000
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0')
}

// ── 中文按標點切塊 ────────────────────────────────────────────────────────────

export function splitZh(text) {
  const chunks = []
  let buf = ''

  for (const ch of text) {
    buf += ch
    if (buf.length >= MAX_ZH && PUNCT.has(ch)) {
      chunks.push(buf.trim()); buf = ''
    } else if (buf.length >= HARD_MAX) {
      let lp = -1
      for (let i = buf.length - 1; i >= MAX_ZH / 2; i--) {
        if (PUNCT.has(buf[i])) { lp = i; break }
      }
      if (lp > 0) { chunks.push(buf.slice(0, lp + 1).trim()); buf = buf.slice(lp + 1) }
      else         { chunks.push(buf.trim()); buf = '' }
    }
  }

  if (buf.trim()) chunks.push(buf.trim())
  return chunks.length ? chunks : [text]
}

// ── 英文字元位置 → 毫秒 ───────────────────────────────────────────────────────

function enPosToMs(pos, sources) {
  let cum = 0
  for (const src of sources) {
    const l = src.text.length
    if (cum + l >= pos || src === sources[sources.length - 1]) {
      const [st, et] = src.timestamp.split(' --> ')
      return Math.round(tsToMs(st) + (pos - cum) / Math.max(l, 1) * (tsToMs(et) - tsToMs(st)))
    }
    cum += l
  }
  return tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1])
}

// ── 套用單一翻譯 ──────────────────────────────────────────────────────────────

export function applyTranslation(unit, zhText, counter) {
  const { sources } = unit
  const enTotal    = sources.reduce((s, b) => s + b.text.length, 0)
  const zhTotal    = zhText.length
  const chunks     = splitZh(zhText)
  const groupEnd   = tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1])
  let zhCum = 0

  return chunks.map((chunk, i) => {
    const zs = zhCum, ze = zhCum + chunk.length; zhCum = ze
    const cs = enPosToMs(zs / zhTotal * enTotal, sources)
    const ce = i < chunks.length - 1
      ? enPosToMs(ze / zhTotal * enTotal, sources)
      : groupEnd
    return {
      index:     String(counter + i),
      timestamp: `${msToTs(cs)} --> ${msToTs(Math.max(ce, cs + 500))}`,
      text:      chunk,
    }
  })
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('apply_translations.js')) {
  const [,, inputPath, translationsPath] = process.argv

  if (!inputPath || !translationsPath) {
    console.error('Usage: node scripts/apply_translations.js <source/input.srt> <translations.json>')
    process.exit(1)
  }

  const merged       = JSON.parse(fs.readFileSync('target/.work/merged.json', 'utf-8'))
  const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'))

  if (translations.length !== merged.length) {
    console.warn(`⚠ 翻譯數量 (${translations.length}) 與句子數量 (${merged.length}) 不符`)
  }

  const out = []
  let counter = 1
  merged.forEach((unit, i) => {
    const zh     = translations[i] ?? unit.text
    const blocks = applyTranslation(unit, zh, counter)
    out.push(...blocks)
    counter += blocks.length
  })

  const filename = path.basename(inputPath, '.srt')
  const outPath  = `target/${filename}_zh.srt`
  writeSrt(out, outPath)
  console.log(`✓ 完成 → ${outPath}  (${out.length} 塊)`)
}
