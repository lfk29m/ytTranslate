#!/usr/bin/env node
/**
 * finalize.js - 自動收集翻譯結果、合併並產出最終 SRT
 * 
 * Usage:
 *   node scripts/finalize.js <source/input.srt>
 */

import fs from 'fs';
import path from 'path';
import { writeSrt } from './srt_helper.js';
import { applyTranslation } from './apply_translations.js';

const inputPath = process.argv[2];
const WORK_DIR = 'target/.work';

if (!inputPath) {
  console.error('Usage: node scripts/finalize.js <source/input.srt>');
  process.exit(1);
}

// 1. 讀取合併前的資料
const mergedPath = path.join(WORK_DIR, 'merged.json');
if (!fs.existsSync(mergedPath)) {
  console.error('錯誤：找不到 merged.json，請先執行 preprocess.js');
  process.exit(1);
}
const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

// 2. 自動收集所有 result_*.json
const files = fs.readdirSync(WORK_DIR)
  .filter(f => f.startsWith('result_') && f.endsWith('.json'))
  .sort((a, b) => {
    const na = parseInt(a.replace('result_', '').replace('.json', ''));
    const nb = parseInt(b.replace('result_', '').replace('.json', ''));
    return na - nb;
  });

if (files.length === 0) {
  console.error('錯誤：找不到任何 result_*.json 翻譯檔案');
  process.exit(1);
}

console.log(`讀取翻譯檔案: ${files.join(', ')}`);

const translations = [];
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(WORK_DIR, file), 'utf-8'));
  translations.push(...content);
}

// 3. 驗證數量
if (translations.length !== merged.length) {
  console.error(`\n✗ 數量不符：`);
  console.error(`- 預期 (merged.json): ${merged.length} 句`);
  console.error(`- 實際 (result_*.json): ${translations.length} 句`);
  process.exit(1);
}

console.log(`✓ 翻譯一致，開始產生 SRT...`);

// 4. 套用翻譯
const out = [];
let counter = 1;
merged.forEach((unit, i) => {
  const zh = translations[i];
  const blocks = applyTranslation(unit, zh, counter);
  out.push(...blocks);
  counter += blocks.length;
});

const filename = path.basename(inputPath, '.srt');
const outPath = `target/${filename}_zh.srt`;
writeSrt(out, outPath);

console.log(`\n✓ 完成 → ${outPath} (${out.length} 塊)`);
console.log(`中間檔案已保留在 ${WORK_DIR} 供檢查。`);
