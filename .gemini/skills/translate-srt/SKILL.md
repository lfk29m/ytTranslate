---
name: translate-srt
description: 將英文 SRT 字幕翻譯為自然流暢的繁體中文。適用於 SRT 檔案翻譯、YouTube 字幕處理等場景。
---

# 英文 SRT 字幕翻譯工作流 (Gemini 專用)

此技能將英文 SRT 檔案透過「合併 -> 切分 -> 並行翻譯 -> 重組」的工作流，確保翻譯的一致性與效率。

## 執行步驟

### 1. 預處理：合併與切分
首先將碎裂的字幕區塊合併為完整句子，並切分為 3 個區塊以利並行翻譯：

```bash
node scripts/merge.js <input.srt>
node scripts/split_chunks.js 3
```
- `merged.json`: 原始合併資料
- `chunk_0.json`, `chunk_1.json`, `chunk_2.json`: 待翻譯的英文句子陣列

### 2. 並行翻譯 (核心步驟)
**必須在同一次工具呼叫中**，啟動 3 個 `generalist` 子代理，分別負責一個 chunk 的翻譯。

**子代理指令範本：**
> 讀取 `target/.work/chunk_N.json` (純字串陣列)。
> 將每句翻譯成自然、口語化的繁體中文：
> - 專門術語（人名、技術詞）可保留英文。
> - 確保輸出陣列長度與輸入完全一致。
> - 將結果寫入 `target/.work/result_N.json`，格式為：`["翻譯1", "翻譯2", ...]`

### 3. 驗證與合併
讀取所有 `result_N.json` 並與 `merged.json` 比對數量是否一致：

```bash
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('target/.work/merged.json','utf-8'));
const t = [
  ...JSON.parse(fs.readFileSync('target/.work/result_0.json','utf-8')),
  ...JSON.parse(fs.readFileSync('target/.work/result_1.json','utf-8')),
  ...JSON.parse(fs.readFileSync('target/.work/result_2.json','utf-8')),
];
console.log('翻譯數量:', t.length, '/ 原文數量:', m.length, '/', t.length === m.length ? '✓ 一致' : '✗ 不一致');
if (t.length === m.length) fs.writeFileSync('target/.work/translations.json', JSON.stringify(t, null, 2));
"
```

### 4. 輸出最終 SRT
```bash
node scripts/apply_translations.js <input.srt> target/.work/translations.json
```
輸出檔案位於 `target/<filename>_zh.srt`。

### 5. 上傳至 Google 雲端硬碟 (選用)
當翻譯完成且檔案產生後，**主動詢問**使用者是否要將結果上傳至雲端硬碟。

如果使用者同意，請執行以下操作：
1. 確認 `.gdrive-creds/credentials.json` 已存在（若不存在，請引導使用者至 Google Cloud Console 建立 OAuth 客戶端 ID 並下載）。
2. 使用腳本執行上傳：
```bash
node scripts/upload_to_gdrive.js target/<filename>_zh.srt 1QauwbMba5Ta7MfrvIREAGoWGyCXXOeHf
```

## 故障排除
- **數量不一致**：若某個 `result_N.json` 缺少句子，請針對該 chunk 重新執行子代理翻譯。
- **寫入失敗**：寫入大型 JSON 時，優先使用 `write_file` 工具而非 shell 重導向，以避免 buffer 溢出。
