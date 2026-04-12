#!/usr/bin/env node
/**
 * preprocess.js - 清理環境、合併字幕、並切分為翻譯區塊
 */

import fs from 'fs';
import path from 'path';
import { parseSrt } from './srt_helper.js';

const inputPath = process.argv[2];
const chunkCount = parseInt(process.argv[3]) || 3;

if (!inputPath) {
  console.error('Usage: node scripts/preprocess.js <source/input.srt> [chunkCount]');
  process.exit(1);
}

const WORK_DIR = 'target/.work';
const SENTENCE_END = /[.!?]\s*$/;

/**
 * 核心合併邏輯
 */
function mergeFragments(blocks) {
  const merged = [];
  let buf = [], texts = [];

  const flush = () => {
    if (!buf.length) return;
    merged.push({ text: texts.filter(Boolean).join(' '), sources: [...buf] });
    buf = []; texts = [];
  };

  blocks.forEach((b, i) => {
    const text = b.text.trim();
    buf.push(b); texts.push(text);

    const isLast = i === blocks.length - 1;
    let nextGap = false;
    if (!isLast) {
      const c = parseInt(b.index), n = parseInt(blocks[i + 1].index);
      if (!isNaN(c) && !isNaN(n)) nextGap = n - c > 1;
    }

    if (SENTENCE_END.test(text) || isLast || nextGap) flush();
  });

  return merged;
}

// 1. 清除舊的中間檔案
if (fs.existsSync(WORK_DIR)) {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
}
fs.mkdirSync(WORK_DIR, { recursive: true });

// 2. 解析與合併
const blocks = parseSrt(inputPath);
const merged = mergeFragments(blocks);
fs.writeFileSync(path.join(WORK_DIR, 'merged.json'), JSON.stringify(merged, null, 2), 'utf-8');

// 3. 切分
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

console.log(`預處理完成：合併後共 ${N} 句，切分為 ${created} 個 chunk。`);
