#!/usr/bin/env node
/**
 * split_chunks.js - 將 merged.json 切成多個 chunk 供並行翻譯
 *
 * Usage:
 *   node scripts/split_chunks.js [chunkCount]
 *
 * 預設切成 3 個 chunk。
 * 輸出：target/.work/chunk_0.json, chunk_1.json, chunk_2.json, ...
 */

import fs from 'fs'

const chunkCount = parseInt(process.argv[2]) || 3

const merged = JSON.parse(fs.readFileSync('target/.work/merged.json', 'utf-8'))
const N = merged.length
const chunkSize = Math.ceil(N / chunkCount)

let created = 0
for (let i = 0; i < chunkCount; i++) {
  const start = i * chunkSize
  const chunk = merged.slice(start, start + chunkSize)
  if (chunk.length === 0) break
  fs.writeFileSync(`target/.work/chunk_${i}.json`, JSON.stringify(chunk, null, 2), 'utf-8')
  console.log(`chunk_${i}.json：${chunk.length} 句（第 ${start + 1}–${start + chunk.length} 句）`)
  created++
}

console.log(`\n共 ${N} 句，切成 ${created} 個 chunk`)
