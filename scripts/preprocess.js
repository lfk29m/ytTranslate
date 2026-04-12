#!/usr/bin/env node
/**
 * preprocess.js - 清理環境、合併字幕、並切分為翻譯區塊
 * 
 * Usage:
 *   node scripts/preprocess.js <source/input.srt> [chunkCount]
 */

import fs from 'fs';
import path from 'path';
import { parseSrt } from './srt_helper.js';
import { mergeFragments } from './merge.js';

const inputPath = process.argv[2];
const chunkCount = parseInt(process.argv[3]) || 3;

if (!inputPath) {
  console.error('Usage: node scripts/preprocess.js <source/input.srt> [chunkCount]');
  process.exit(1);
}

const WORK_DIR = 'target/.work';

// 1. 第一步：清除舊的中間檔案 (確保除錯環境乾淨)
if (fs.existsSync(WORK_DIR)) {
  console.log(`清理舊的中間檔案: ${WORK_DIR}`);
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
}
fs.mkdirSync(WORK_DIR, { recursive: true });

// 2. 合併字幕片段
const blocks = parseSrt(inputPath);
const merged = mergeFragments(blocks);
fs.writeFileSync(path.join(WORK_DIR, 'merged.json'), JSON.stringify(merged, null, 2), 'utf-8');

// 3. 切分為 Chunk
const N = merged.length;
const chunkSize = Math.ceil(N / chunkCount);

let created = 0;
for (let i = 0; i < chunkCount; i++) {
  const start = i * chunkSize;
  const chunk = merged.slice(start, start + chunkSize).map(({ text }) => text);
  if (chunk.length === 0) break;
  fs.writeFileSync(path.join(WORK_DIR, `chunk_${i}.json`), JSON.stringify(chunk, null, 2), 'utf-8');
  created++;
}

console.log(`\n預處理完成：`);
console.log(`- 原始片段: ${blocks.length} 塊`);
console.log(`- 合併後句子: ${N} 句`);
console.log(`- 已切分為 ${created} 個 chunk 存放在 ${WORK_DIR}/`);
