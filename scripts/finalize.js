#!/usr/bin/env node
/**
 * finalize.js - 自動收集結果、合併、驗證並產出最終 SRT
 */

import fs from 'fs';
import path from 'path';
import { writeSrt } from './srt_helper.js';

const inputPath = process.argv[2];
const WORK_DIR = 'target/.work';

if (!inputPath) {
  console.error('Usage: node scripts/finalize.js <source/input.srt>');
  process.exit(1);
}

// ── 核心翻譯套用與切分邏輯 (整合自 apply_translations.js) ───────────────────────

const MAX_ZH = 22, HARD_MAX = 32, ABS_MAX = 60;
const PUNCT = new Set([...'。，！？；、：—']);

function tsToMs(ts) {
  const [h, m, r] = ts.split(':');
  const [s, ms] = r.split(',');
  return +h * 3600000 + +m * 60000 + +s * 1000 + +ms;
}

function msToTs(ms) {
  const h = Math.floor(ms / 3600000); ms %= 3600000;
  const m = Math.floor(ms / 60000); ms %= 60000;
  const s = Math.floor(ms / 1000); ms %= 1000;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0');
}

function splitZh(text) {
  const chunks = []; let buf = '';
  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx]; buf += ch;
    if (buf.length >= MAX_ZH && PUNCT.has(ch)) { chunks.push(buf.trim()); buf = ''; }
    else if (buf.length >= HARD_MAX) {
      let nearPunct = false;
      for (let j = idx + 1; j < Math.min(idx + 1 + 20, text.length); j++) { if (PUNCT.has(text[j])) { nearPunct = true; break; } }
      if (!nearPunct || buf.length >= ABS_MAX) {
        const sp = buf.lastIndexOf(' ');
        if (sp > 0) { chunks.push(buf.slice(0, sp).trim()); buf = buf.slice(sp + 1); }
        else { chunks.push(buf.trim()); buf = ''; }
      }
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text];
}

function enPosToMs(pos, sources) {
  let cum = 0;
  for (const src of sources) {
    const l = src.text.length;
    if (cum + l >= pos || src === sources[sources.length - 1]) {
      const [st, et] = src.timestamp.split(' --> ');
      return Math.round(tsToMs(st) + (pos - cum) / Math.max(l, 1) * (tsToMs(et) - tsToMs(st)));
    }
    cum += l;
  }
  return tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1]);
}

function applyTranslation(unit, zhText, counter) {
  const { sources } = unit;
  const enTotal = sources.reduce((s, b) => s + b.text.length, 0), zhTotal = zhText.length;
  const chunks = splitZh(zhText), groupEnd = tsToMs(sources[sources.length - 1].timestamp.split(' --> ')[1]);
  let zhCum = 0;
  return chunks.map((chunk, i) => {
    const zs = zhCum, ze = zhCum + chunk.length; zhCum = ze;
    const cs = enPosToMs(zs / zhTotal * enTotal, sources);
    const ce = i < chunks.length - 1 ? enPosToMs(ze / zhTotal * enTotal, sources) : groupEnd;
    return { index: String(counter + i), timestamp: `${msToTs(cs)} --> ${msToTs(Math.max(ce, cs + 500))}`, text: chunk };
  });
}

// ── 執行流程 ──────────────────────────────────────────────────────────────────

if (!fs.existsSync(path.join(WORK_DIR, 'merged.json'))) {
  console.error('找不到 merged.json'); process.exit(1);
}
const merged = JSON.parse(fs.readFileSync(path.join(WORK_DIR, 'merged.json'), 'utf-8'));
const files = fs.readdirSync(WORK_DIR).filter(f => f.startsWith('result_') && f.endsWith('.json')).sort((a, b) => {
  const na = parseInt(a.match(/\d+/)[0]), nb = parseInt(b.match(/\d+/)[0]);
  return na - nb;
});

const translations = [];
for (const file of files) { translations.push(...JSON.parse(fs.readFileSync(path.join(WORK_DIR, file), 'utf-8'))); }

if (translations.length !== merged.length) {
  console.error(`數量不符: ${translations.length} / ${merged.length}`); process.exit(1);
}

const out = []; let counter = 1;
merged.forEach((unit, i) => {
  const blocks = applyTranslation(unit, translations[i], counter);
  out.push(...blocks); counter += blocks.length;
});

const outPath = `target/${path.basename(inputPath, '.srt')}_zh.srt`;
writeSrt(out, outPath);
console.log(`✓ 完成 → ${outPath}`);
